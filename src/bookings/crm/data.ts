// Live CRM data from Firebase (staff can read crm/ directly; see database.rules.json).
import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import * as XLSX from "xlsx";
import { db } from "../../firebase";
import { api, DEMO } from "../client/api";
import type { Booking, MoneyStatus } from "../shared/types";
import { withDefaults, type RateCard } from "../shared/rateCard";
import { moneyStatus, describeWhen, TYPE_LABEL, STAGE_LABEL, PAY_LABEL } from "../shared/pricing";
import { fmtDate, todayIST } from "../shared/dates";

export type Row = Booking & { m: MoneyStatus };

export function useCrm() {
  const [raw, setRaw] = useState<Record<string, Booking> | null>(null);
  const [rc, setRc] = useState<RateCard>(withDefaults(null));
  const [error, setError] = useState("");
  useEffect(() => {
    if (DEMO) { const t = () => api.devList().then(setRaw).catch(e => setError(e.message)); t(); const i = setInterval(t, 3000); return () => clearInterval(i); }
    return onValue(ref(db, "crm/bookings"), s => setRaw(s.val() || {}), e => setError(e.message));
  }, []);
  useEffect(() => onValue(ref(db, "crm/config/rateCard"), s => setRc(withDefaults(s.val())), () => {}), []);
  const rows: Row[] = useMemo(() => Object.entries(raw || {}).map(([id, b]) => {
    const x = { ...b, id } as Booking;
    return { ...x, m: moneyStatus(x) };
  }).sort((a, b) => b.createdAt - a.createdAt), [raw]);
  return { rows, rc, loading: raw === null && !error, error };
}

/** Does this booking need a human today? */
export function needsAction(r: Row, today = todayIST()): string | null {
  if (["cancelled", "lost", "completed"].includes(r.stage)) return null;
  if (r.m.pendingVerification > 0) return "Verify payment";
  if (r.stage === "confirmed" && r.quote.lastDate < today && r.m.outstanding > 0.5) return "Event over · unpaid";
  if (r.m.installments.some(i => i.state === "overdue")) return "Overdue";
  if (r.stage === "confirmed" && r.m.nextDue?.dueDate && r.m.nextDue.dueDate <= today) return "Balance due";
  if (["enquiry", "quoted"].includes(r.stage) && (!r.followUpOn || r.followUpOn <= today)) return r.stage === "enquiry" ? "New enquiry" : "Follow up";
  return null;
}

/** One flat row per booking — the "Excel CRM". */
export function flatten(r: Row, rc: RateCard, appUrl = location.origin) {
  const q = r.quote; const pays = Object.values(r.payments || {});
  return {
    "Quote No": r.quoteNo, "Ref": r.ref, "Created": fmtDate(new Date(r.createdAt + 330 * 60000).toISOString().slice(0, 10), false),
    "Stage": STAGE_LABEL[r.stage], "Payment status": PAY_LABEL[r.m.status], "Needs action": needsAction(r) || "",
    "Name": r.name, "Mobile": r.phone, "Email": r.email, "Organisation": r.organisation || "", "Client type": r.clientType || "", "GSTIN": r.gstin || "",
    "Booking type": TYPE_LABEL[r.input.type], "Subscription / one-time": ["subscription", "night_subscription"].includes(r.input.type) ? "Subscription" : r.input.event?.oneTime === false ? "One-time (asked about subscription)" : "One-time",
    "Footfall": r.input.event ? rc.tierLabels[r.input.event.guestsTier] : "",
    "Needs": r.input.event ? { space: "Space", both: "Space + ticketing", tix: "Ticketing only" }[r.input.event.need] : "",
    "Set-up / wrap-up (min)": r.input.event ? `${r.input.event.preMin} / ${r.input.event.postMin}` : "",
    "First event at LR": r.input.event ? (r.input.event.firstTime ? "Yes" : "No") : "",
    "Wants subscription": r.input.event ? (r.input.event.oneTime ? "No" : "Yes") : "",
    "Ticket price × expected": r.input.event?.ticketPrice != null ? `${r.input.event.ticketPrice} × ${r.input.event.ticketsExpected || 0}` : "",
    "Event / class": r.title, "Purpose": r.purpose, "Guests": r.input.guests || "", "When": describeWhen(r.input, rc),
    "Event date (first)": q.firstDate, "Event date (last)": q.lastDate, "Sessions": q.sessionsCount, "Hours": q.hours,
    "Standard value (incl GST)": q.standardTotal, "Discount (pre-GST)": q.discount, "Discount note": r.input.discountNote || "",
    "Taxable": q.taxable, "GST": q.gst, "Total (incl GST)": q.total, "Deposit": q.deposit, "Grand total": q.grandTotal,
    "Advance to be paid": q.advance, "Balance amount": q.balance, "Balance due date": q.balanceDueDate,
    "Date of first payment": r.m.firstPaidOn || "", "Paid (verified)": r.m.verifiedPaid, "Awaiting verification": r.m.pendingVerification,
    "Outstanding": Math.max(0, r.m.outstanding), "Last UTR": r.m.lastUtr || "", "Payments": pays.map(p => `${p.paidOn} ₹${p.amount} ${p.utr}${p.verified ? "" : " (unverified)"}`).join("; "),
    "Source": r.source, "Source detail": r.sourceDetail || "", "Heard from": r.heardFrom || "", "Assigned to": r.assignedTo || "", "Follow-up on": r.followUpOn || "",
    "Partner bank a/c name": r.partnerBank?.accountName || "", "Partner a/c no": r.partnerBank?.accountNo || "", "Partner IFSC": r.partnerBank?.ifsc || "",
    "Partner UPI": r.partnerBank?.upi || "", "Partner PAN": r.partnerBank?.pan || "",
    "Requests": r.requests || "", "Confirmed at": r.confirmedAt ? new Date(r.confirmedAt).toLocaleString("en-IN") : "",
    "Reconciled at": r.reconciledAt ? new Date(r.reconciledAt).toLocaleString("en-IN") : "", "Cancel reason": r.cancelReason || "",
    "Client link": `${appUrl}/b/${r.id}`,
  };
}

export function exportXlsx(rows: Row[], rc: RateCard) {
  const wb = XLSX.utils.book_new();
  const data = rows.map(r => flatten(r, rc));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] || {}).map(k => ({ wch: Math.min(40, Math.max(10, k.length + 2)) }));
  XLSX.utils.book_append_sheet(wb, ws, "Bookings");
  const pays = rows.flatMap(r => Object.values(r.payments || {}).map(p => ({ "Ref": r.ref, "Name": r.name, "Paid on": p.paidOn, "Amount": p.amount, "UTR": p.utr, "Method": p.method, "Verified": p.verified ? "Yes" : "No", "Verified by": p.verifiedBy || "", "Entered by": p.source })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pays.length ? pays : [{ Ref: "" }]), "Payments");
  XLSX.writeFile(wb, `LivingRoot_CRM_${todayIST()}.xlsx`);
}
