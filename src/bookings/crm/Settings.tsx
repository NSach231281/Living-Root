// /crm/settings (admin) — rate card, bank/UPI details, links, calendar sync, daily job.
import React, { useEffect, useState } from "react";
import { ref, set } from "firebase/database";
import { db } from "../../firebase";
import { useCrmCtx } from "./CrmLayout";
import { api } from "../client/api";
import { ErrorBox } from "../client/ui";
import { DEFAULT_RATE_CARD, type RateCard, type AddOnDef } from "../shared/rateCard";
import { Plus, Trash2, Save } from "lucide-react";

const NUM: [keyof RateCard, string, string?][] = [
  ["ticketingHourly", "Space + ticketing ₹/hr", "Also the ticketing-only rental (events over 1 hr)"], ["ticketShareLrPct", "Living Roots' ticket share %"],
  ["firstTimerPct", "First-timer weekday offer %"], ["freeBufferMin", "Free set-up / wrap-up (min each side)"],
  ["smallTotal", "Small booking below ₹ (total)"], ["smallAdvance", "… pays a flat advance ₹"], ["eventAdvancePct", "Otherwise advance %"], ["rescheduleFee", "Date change fee ₹ + GST"],
  ["standardHourly", "Standard rate ₹/hr", "Shown as the 'standard' price"], ["weekdayHourly", "Weekday rate ₹/hr", "Mon–Fri online / first-time"], ["weekendHourly", "Weekend rate ₹/hr", "Sat–Sun"],
  ["longBookingHours", "Long booking from (hrs)"], ["longBookingDiscountPct", "Long booking discount %"], ["minHours", "Minimum hours"], ["overtimeHourly", "Overtime ₹/hr"],
  ["subscriptionDiscountPct", "Subscription discount % (off standard)"], ["subscription1MonthExtraPct", "Extra % off — month to month"], ["subscription3MonthExtraPct", "Extra % off — 3+ months"], ["weeksPerMonth", "Weeks counted per month"],
  ["nightRateIncl", "Late-night ₹/night (incl. GST)"], ["nightDeposit", "Late-night deposit ₹"],
  ["advancePct", "Advance % (one-time bookings)"], ["balanceDaysBefore", "Balance due (days before event)"], ["quoteValidDays", "Quote valid (days)"],
];
const TXT: [keyof RateCard, string][] = [
  ["offerStart", "First-timer offer from (HH:MM)"], ["offerEnd", "First-timer offer until (HH:MM)"],
  ["openTime", "Earliest start (HH:MM)"], ["closeTime", "Latest end (HH:MM)"], ["nightStart", "Late-night start"], ["nightEnd", "Late-night end"],
  ["upiVpa", "UPI ID (for QR)"], ["upiName", "UPI payee name"], ["bankAccountName", "Account name"], ["bankName", "Bank"], ["bankAccountNo", "Account no."], ["bankIfsc", "IFSC"],
  ["gstin", "GSTIN"], ["homeStateCode", "Home state code (29 = KA)"], ["phone", "Phone / WhatsApp"], ["email", "Email"], ["address", "Address"],
];

export default function Settings() {
  const { rc, isAdmin } = useCrmCtx();
  const [f, setF] = useState<RateCard>(rc);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [run, setRun] = useState<any>(null);
  useEffect(() => setF(rc), [rc]);
  if (!isAdmin) return <p className="p-6">Admins only.</p>;

  const save = async () => { setErr(""); try { await set(ref(db, "crm/config/rateCard"), JSON.parse(JSON.stringify(f))); setMsg("Saved — new quotes use these numbers."); setTimeout(() => setMsg(""), 3000); } catch (e: any) { setErr(e.message); } };
  const setAdd = (i: number, k: keyof AddOnDef, v: any) => setF({ ...f, addOns: f.addOns.map((a, j) => j === i ? { ...a, [k]: v } : a) });
  const base = location.origin;

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 space-y-4">
      <Box title="Links to share">
        <ul className="text-sm space-y-1">
          <li><b>Public booking form:</b> <code className="text-xs bg-brand-bone px-1">{base}/book</code> — add <code className="text-xs">?src=instagram</code> to track the channel, <code className="text-xs">&type=subscription</code> to open on classes.</li>
          <li><b>Rep form:</b> <code className="text-xs bg-brand-bone px-1">{base}/crm/new</code> (signed-in staff)</li>
        </ul>
      </Box>

      <Box title="Calendar sync (free)">
        <p className="text-sm mb-2">Subscribe once and every confirmed booking (and on-hold slot, marked [HOLD]) shows up automatically:</p>
        <code className="block text-xs bg-brand-bone p-2 rounded break-all">{base}/api/bookings?action=ics&key=YOUR_CALENDAR_FEED_KEY</code>
        <ul className="text-xs text-brand-clay mt-2 list-disc pl-4 space-y-1">
          <li><b>Google Calendar:</b> Other calendars → + → From URL → paste. (Google refreshes every few hours.) Notion Calendar shows it too once it's in Google.</li>
          <li><b>iPhone:</b> Settings → Calendar → Accounts → Add Subscribed Calendar.</li>
          <li><b>Notion database (instant):</b> set NOTION_TOKEN and NOTION_DATABASE_ID on Vercel — confirmed bookings are written to that database straight away.</li>
        </ul>
      </Box>

      <Box title="Daily automatic check" right={<span className="text-xs text-brand-muted">8:30 AM and 9 PM IST</span>}>
        <p className="text-sm mb-2">Emails clients whose balance is due today (the day before their event), flags overdue payments, marks fully-paid finished events completed, and sends the team a digest. At 9 PM it lists every client payment still not matched to the bank, so a rep can chase it.</p>
        <div className="flex gap-2">
          <button className="btn-outline !py-2" onClick={async () => { setErr(""); try { setRun(await api.runDaily(true)); } catch (e: any) { setErr(e.message); } }}>Preview (no emails)</button>
          <button className="btn-outline !py-2" onClick={async () => { setErr(""); try { setRun(await api.runEvening(true)); } catch (e: any) { setErr(e.message); } }}>Pending payments (9 PM check)</button>
          <button className="btn-primary !py-2" onClick={async () => { if (!confirm("Send today's reminders and digest now?")) return; setErr(""); try { setRun(await api.runDaily(false)); } catch (e: any) { setErr(e.message); } }}>Run now</button>
        </div>
        {run && <pre className="text-xs bg-brand-bone p-2 rounded mt-2 overflow-x-auto">{JSON.stringify(run, null, 2)}</pre>}
      </Box>

      <Box title="Event pricing — footfall tiers (₹/hr + GST)">
        <div className="grid grid-cols-3 gap-3">
          {f.tierLabels.map((l, i) => <label key={i} className="text-xs"><span className="label !mb-1">{l}</span>
            <input type="number" className="input !py-2" value={f.tierHourly[i]} onChange={e => setF({ ...f, tierHourly: f.tierHourly.map((v, j) => j === i ? Number(e.target.value) : v) })}/></label>)}
        </div>
        <p className="text-xs text-brand-muted mt-2">Used by the 30-second form at /book. The fields below (first group) cover ticketing, the first-timer offer, set-up time and advances.</p>
      </Box>

      <Box title="Rate card" right={<button className="text-xs text-brand-muted underline" onClick={() => confirm("Reset all numbers to the defaults?") && setF(DEFAULT_RATE_CARD)}>Reset to defaults</button>}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {NUM.map(([k, l, h]) => <label key={k} className="text-xs"><span className="label !mb-1">{l}</span>
            <input type="number" step="any" className="input !py-2" value={f[k] as number} onChange={e => setF({ ...f, [k]: Number(e.target.value) })}/>{h && <span className="text-[10px] text-brand-muted">{h}</span>}</label>)}
          <label className="text-xs"><span className="label !mb-1">GST %</span><input type="number" className="input !py-2" value={Math.round(f.gstRate * 100)} onChange={e => setF({ ...f, gstRate: Number(e.target.value) / 100 })}/></label>
        </div>
        <h4 className="font-bold text-sm mt-5 mb-2">Add-ons (pre-GST)</h4>
        {f.addOns.map((a, i) => <div key={i} className="grid grid-cols-[1fr_90px_110px_auto_auto] gap-2 mb-2 items-center text-sm">
          <input className="input !py-2" value={a.label} onChange={e => setAdd(i, "label", e.target.value)}/>
          <input className="input !py-2" type="number" value={a.price} onChange={e => setAdd(i, "price", Number(e.target.value))}/>
          <select className="input !py-2" value={a.unit} onChange={e => setAdd(i, "unit", e.target.value)}><option value="flat">flat</option><option value="per_person">per person</option><option value="per_hour">per hour</option></select>
          <label className="text-xs whitespace-nowrap"><input type="checkbox" checked={a.publicVisible} onChange={e => setAdd(i, "publicVisible", e.target.checked)}/> public</label>
          <button onClick={() => setF({ ...f, addOns: f.addOns.filter((_, j) => j !== i) })}><Trash2 size={14}/></button>
          <input className="input !py-1.5 text-xs col-span-5" placeholder="Description" value={a.detail || ""} onChange={e => setAdd(i, "detail", e.target.value)}/>
        </div>)}
        <button className="text-sm text-brand-spice font-bold flex items-center gap-1" onClick={() => setF({ ...f, addOns: [...f.addOns, { id: `a${Date.now().toString(36)}`, label: "New add-on", price: 0, unit: "flat", publicVisible: true }] })}><Plus size={14}/> Add-on</button>
      </Box>

      <Box title="Business & payment details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TXT.map(([k, l]) => <label key={k} className={`text-xs ${k === "address" ? "col-span-2 md:col-span-3" : ""}`}><span className="label !mb-1">{l}</span>
            <input className="input !py-2" value={f[k] as string} onChange={e => setF({ ...f, [k]: e.target.value })}/></label>)}
        </div>
      </Box>

      <ErrorBox>{err}</ErrorBox>
      <div className="sticky bottom-3 flex justify-end gap-2 items-center">
        {msg && <span className="text-sm text-emerald-700 bg-white px-3 py-2 rounded-lg">{msg}</span>}
        <button onClick={save} className="btn-primary flex items-center gap-1 shadow-elite"><Save size={14}/> Save settings</button>
      </div>
    </div>
  );
}

const Box = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) =>
  <section className="bg-white rounded-xl border border-brand-border p-4"><div className="flex justify-between items-center mb-3"><h3 className="font-serif text-lg font-bold">{title}</h3>{right}</div>{children}</section>;
