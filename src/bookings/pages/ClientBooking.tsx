// /b/:id — the client's own booking page (the link we send on WhatsApp / email).
// Shows the quote, a UPI QR for whatever is due next, an "I've paid" form, and calendar links.
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../client/api";
import { BookingShell, Section, Field, QR, QuoteTable, Schedule, Spinner, ErrorBox } from "../client/ui";
import type { PublicBooking } from "../shared/types";
import type { RateCard } from "../shared/rateCard";
import { describeWhen, expandSessions, upiLink, TYPE_LABEL } from "../shared/pricing";
import { buildIcs, bookingIcsEvents, googleCalLink } from "../shared/ics";
import { fmtDate, fmtTime, inr, inr2, todayIST } from "../shared/dates";
import { Copy, CheckCircle2, Smartphone, Printer, CalendarPlus, MessageCircle, Clock, PartyPopper } from "lucide-react";

export default function ClientBooking() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const [b, setB] = useState<PublicBooking | null>(null);
  const [rc, setRc] = useState<RateCard | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const [pay, setPay] = useState({ amount: "", utr: "", paidOn: todayIST() });
  const [sending, setSending] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  const load = useCallback(() => api.get(id).then(setB).catch(e => setErr(e.message)), [id]);
  useEffect(() => { load(); api.config().then(x => setRc(x.rateCard)).catch(() => {}); }, [load]);
  // While a payment is being verified, poll so the page flips to "Confirmed" by itself
  useEffect(() => {
    if (!b || b.money.pendingVerification <= 0) return;
    const t = setInterval(load, 20000); return () => clearInterval(t);
  }, [b, load]);

  const next = b?.money.nextDue;
  useEffect(() => { if (next) setPay(p => ({ ...p, amount: String(next.due) })); }, [next?.id, next?.due]);

  if (err && !b) return <BookingShell><ErrorBox>{err}</ErrorBox></BookingShell>;
  if (!b || !rc) return <BookingShell><Spinner/></BookingShell>;

  const m = b.money;
  const confirmed = b.stage === "confirmed" || b.stage === "completed";
  const closed = b.stage === "cancelled" || b.stage === "lost";
  const verifying = m.pendingVerification > 0;
  const dueNow = next ? Math.max(0, next.due - m.pendingVerification) : 0;
  const upi = upiLink(rc, dueNow, `${b.ref} ${b.title}`);
  const sessions = expandSessions(b.input, rc);
  const copy = (t: string, k: string) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(""), 1800); };
  const wa = (rc.phone || "").replace(/\D/g, "");

  const status = closed ? ["Closed", "This booking was cancelled. Contact us to rebook.", "bg-stone-200 text-stone-700"]
    : m.status === "paid" ? ["Confirmed · fully paid", "See you at Living Roots!", "bg-emerald-600 text-white"]
    : confirmed ? ["Confirmed", next?.dueDate ? `Next payment ${inr(next.due)} due ${fmtDate(next.dueDate)}` : "Your date is blocked.", "bg-emerald-600 text-white"]
    : verifying ? ["Payment being verified", "We're matching your payment with the bank — usually within a few hours.", "bg-amber-500 text-white"]
    : ["Awaiting advance", `Pay ${inr(dueNow)} to block your date — slots are given on a first-paid basis.`, "bg-brand-spice text-white"];

  async function claim(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setSending(true);
    try { setB(await api.claim({ id, amount: Number(pay.amount), utr: pay.utr, paidOn: pay.paidOn })); setJustPaid(true); setPay(p => ({ ...p, utr: "" })); }
    catch (e: any) { setErr(e.message); }
    setSending(false);
  }

  function downloadIcs() {
    const ics = buildIcs(bookingIcsEvents(b as any, rc!, { forClient: true, appUrl: location.origin }), "Living Roots");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = `living-root-${b!.ref}.ics`; a.click();
  }

  return (
    <BookingShell>
      {params.get("new") && !verifying && !confirmed && <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3 mb-4 text-sm flex gap-2">
        <CheckCircle2 size={18} className="shrink-0"/><span>Your quote is ready{b.email ? ` and a copy is on its way to ${b.email}` : " and a copy is on its way to your WhatsApp"}. <b>Bookmark this page</b> — it's your booking link.</span></div>}

      <div className={`rounded-2xl p-4 mb-4 ${status[2]}`}>
        <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">{b.quoteNo} · {b.ref}</div>
        <div className="font-serif text-2xl font-bold">{status[0]}</div>
        <div className="text-sm opacity-90">{status[1]}</div>
      </div>

      <Section title={b.title}>
        <div className="text-sm space-y-1">
          <div><span className="text-brand-muted">For:</span> <b>{b.name}</b>{b.organisation ? ` · ${b.organisation}` : ""}</div>
          <div><span className="text-brand-muted">What:</span> {TYPE_LABEL[b.input.type]} · {b.purpose}{b.input.guests ? ` · ${b.input.guests} guests` : ""}</div>
          <div><span className="text-brand-muted">When:</span> {describeWhen(b.input, rc)}</div>
        </div>
        {sessions.length > 1 && <details className="mt-2 text-xs"><summary className="cursor-pointer text-brand-spice font-bold">All {sessions.length} sessions</summary>
          <ul className="mt-2 grid grid-cols-1 gap-1">{sessions.map((s, i) => <li key={i} className="text-brand-clay">{fmtDate(s.date)} · {fmtTime(s.start)}–{fmtTime(s.end)}</li>)}</ul></details>}
      </Section>

      {!closed && next && dueNow > 0 && <Section title={confirmed ? "Pay next instalment" : "Pay to block your date"} right={<span className="font-bold text-lg">{inr2(dueNow)}</span>}>
        <p className="text-xs text-brand-muted mb-3">{next.label}{next.dueDate ? ` · due ${fmtDate(next.dueDate)}` : ""}</p>
        <div className="flex flex-col items-center">
          <QR text={upi}/>
          <p className="text-[11px] text-brand-muted mt-2 text-center">Scan with GPay, PhonePe, Paytm or any UPI app — amount and reference are pre-filled.</p>
          <a href={upi} className="btn-primary mt-3 flex items-center gap-2 md:hidden"><Smartphone size={14}/> Open UPI app</a>
          <div className="mt-3 w-full bg-brand-bone rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between gap-2"><span className="text-brand-muted">UPI ID</span><button onClick={() => copy(rc.upiVpa, "upi")} className="font-mono text-right break-all flex items-center gap-1">{rc.upiVpa} {copied === "upi" ? <CheckCircle2 size={12}/> : <Copy size={12}/>}</button></div>
            <div className="flex justify-between"><span className="text-brand-muted">Name</span><span>{rc.upiName}</span></div>
            <div className="flex justify-between"><span className="text-brand-muted">Reference</span><button onClick={() => copy(b.ref, "ref")} className="font-mono flex items-center gap-1">{b.ref} {copied === "ref" ? <CheckCircle2 size={12}/> : <Copy size={12}/>}</button></div>
            <details><summary className="cursor-pointer text-brand-spice font-bold mt-1">Bank transfer (NEFT / IMPS) or our printed QR</summary>
              <div className="mt-2 space-y-1">
                <div>{rc.bankAccountName} · {rc.bankName}</div><div>A/c <b className="font-mono">{rc.bankAccountNo}</b> · IFSC <b className="font-mono">{rc.bankIfsc}</b></div>
                <img src="/upi-qr-yesbank.jpg" alt="Living Roots bank QR" className="w-48 mx-auto mt-2 rounded-lg border border-brand-border"/>
                <p className="text-brand-muted text-center">With this QR, type the amount yourself and add {b.ref} as the note.</p>
              </div></details>
          </div>
        </div>

        <form onSubmit={claim} className="mt-4 border-t border-brand-sand pt-4">
          <p className="font-bold text-sm mb-2">Paid? Tell us so we can confirm faster</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount paid (₹)"><input required type="number" step="0.01" min={1} className="input" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })}/></Field>
            <Field label="Paid on"><input required type="date" className="input" value={pay.paidOn} onChange={e => setPay({ ...pay, paidOn: e.target.value })}/></Field>
          </div>
          <Field label="UPI reference / UTR" hint="12-digit number in your UPI app's payment details (UPI Ref No / UTR)">
            <input required className="input font-mono" inputMode="numeric" value={pay.utr} onChange={e => setPay({ ...pay, utr: e.target.value })}/></Field>
          <ErrorBox>{err}</ErrorBox>
          <button disabled={sending} className="btn-primary w-full">{sending ? "Sending…" : "I've paid"}</button>
        </form>
      </Section>}

      {justPaid && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 text-sm flex gap-2"><Clock size={18} className="shrink-0 text-amber-700"/>
        <span>Thank you! We've noted your payment and your slot is on hold. You'll get a confirmation on WhatsApp once our team verifies it with the bank.</span></div>}

      {m.status === "paid" && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-4 text-sm flex gap-2"><PartyPopper size={18} className="shrink-0 text-emerald-700"/><span>All paid — thank you! Nothing more is due.</span></div>}

      <Section title="Quotation">
        <QuoteTable q={b.quote}/>
      </Section>

      <Section title="Payment schedule" right={<span className="text-xs text-brand-muted">Paid {inr(m.verifiedPaid)}{verifying ? ` · ${inr(m.pendingVerification)} verifying` : ""}</span>}>
        <Schedule q={b.quote} money={m}/>
        {b.payments.length > 0 && <div className="mt-3 text-xs">
          <p className="label !mb-1">Payments received</p>
          {b.payments.map((p, i) => <div key={i} className="flex justify-between py-1 border-b border-brand-sand last:border-0">
            <span>{fmtDate(p.paidOn, false)} · <span className="font-mono">{p.utr}</span></span>
            <span>{inr2(p.amount)} {p.verified ? <span className="text-emerald-700 font-bold">✓</span> : <span className="text-amber-700">(verifying)</span>}</span></div>)}
        </div>}
      </Section>

      {confirmed && sessions.length > 0 && <Section title="Add to your calendar">
        <div className="flex flex-wrap gap-2">
          <a className="btn-outline !px-4 flex items-center gap-1" target="_blank" rel="noreferrer" href={googleCalLink(`${b.title} at Living Roots`, sessions[0], `${location.origin}/b/${b.id}`)}><CalendarPlus size={14}/> Google</a>
          <button className="btn-outline !px-4 flex items-center gap-1" onClick={downloadIcs}><CalendarPlus size={14}/> Apple / Outlook (.ics){sessions.length > 1 ? ` · ${sessions.length}` : ""}</button>
        </div>
      </Section>}

      <Section title="Terms">
        <ul className="text-[11px] text-brand-clay list-disc pl-4 space-y-1">{b.quote.notes.map((n, i) => <li key={i}>{n}</li>)}
          <li>Scope covers use of the space and the facilities listed. This quote is valid for {rc.quoteValidDays} days from {fmtDate(new Date(b.createdAt).toISOString().slice(0, 10), false)}.</li></ul>
        <p className="text-[11px] text-brand-muted mt-3">{rc.address} · GSTIN {rc.gstin}</p>
      </Section>

      <div className="flex gap-2 print:hidden">
        <a className="btn-secondary flex-1 flex items-center justify-center gap-1" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi Living Roots, about my booking ${b.ref} (${b.title})`)}`}><MessageCircle size={14}/> WhatsApp us</a>
        <button className="btn-secondary flex-1 flex items-center justify-center gap-1" onClick={() => window.print()}><Printer size={14}/> Save PDF</button>
      </div>
    </BookingShell>
  );
}
