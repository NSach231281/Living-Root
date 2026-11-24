// The booking / requirement form.
//   /book            → public (clients, social-media link). ?src=instagram&type=subscription&date=YYYY-MM-DD prefill
//   /crm/new         → rep mode: same form + discounts, rate override, custom lines, source
//   /crm/edit/:id    → rep edits an existing booking's quote
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";
import { api, DEMO } from "../client/api";
import { BookingShell, Section, Field, Chip, QuoteTable, Schedule, Spinner, ErrorBox } from "../client/ui";
import type { RateCard } from "../shared/rateCard";
import { PURPOSES } from "../shared/rateCard";
import type { Booking, BookingType, BusyBlock, CustomLine, QuoteInput, Session } from "../shared/types";
import { computeQuote, expandSessions, overlaps } from "../shared/pricing";
import { addDays, DAY_SHORT, fmtDate, fmtTime, inr, inr2, sessionHours } from "../shared/dates";
import { Plus, Trash2, CalendarDays, Repeat, Moon, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";

const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const SOURCES = [["social", "Social media"], ["website", "Website"], ["whatsapp", "WhatsApp"], ["referral", "Referral"], ["walk_in", "Walk-in"], ["rep", "Rep / phone"], ["other", "Other"]];

export default function BookForm({ mode }: { mode: "public" | "staff" }) {
  const staff = mode === "staff";
  const nav = useNavigate();
  const { id: editId } = useParams();
  const [params] = useSearchParams();
  const [rc, setRc] = useState<RateCard | null>(null);
  const [busy, setBusy] = useState<BusyBlock[]>([]);
  const [today, setToday] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);

  // ── form state ──
  const initDate = params.get("date") || "";
  const [type, setType] = useState<BookingType>((["venue", "subscription", "night_subscription"].includes(params.get("type") || "") ? params.get("type") : "venue") as BookingType);
  const [sessions, setSessions] = useState<Session[]>([{ date: initDate, start: "10:00", end: "13:00" }]);
  const [sub, setSub] = useState({ days: [] as number[], start: "17:00", end: "18:00", startDate: "", months: 3 });
  const [nights, setNights] = useState({ startMonth: "", months: 1 });
  const [custom, setCustom] = useState<CustomLine[]>([{ label: "", qty: 1, unit: "", rate: 0 }]);
  const [guests, setGuests] = useState<number | "">("");
  const [addOns, setAddOns] = useState<Record<string, boolean>>({});
  const [purpose, setPurpose] = useState("Workshop");
  const [title, setTitle] = useState("");
  const [requests, setRequests] = useState("");
  const [c, setC] = useState({ name: "", phone: "", email: "", organisation: "", gstin: "", clientType: "individual", heardFrom: "", consent: true });
  const [bank, setBank] = useState({ accountName: "", accountNo: "", ifsc: "", bankName: "", upi: "", pan: "" });
  const [showGst, setShowGst] = useState(false);
  const [r, setR] = useState({ rateOverride: "", discountPct: "", discountFlat: "", discountNote: "", advancePct: "", waive: [] as string[], source: params.get("src") ? "social" : staff ? "rep" : "website", sourceDetail: params.get("src") || "", sendEmail: true });
  const [hp, setHp] = useState(""); // honeypot

  useEffect(() => {
    api.config().then(x => { setRc(x.rateCard); setBusy(x.busy); setToday(x.today); })
      .catch(e => setErr(`Could not load booking settings: ${e.message}`));
  }, []);

  // Edit mode: load the booking (staff can read crm/ directly)
  useEffect(() => {
    if (!editId) return;
    const fill = (b: Booking) => {
      if (!b || editing) return;
      if (b.input?.type === "event") { nav(`/crm/quick-edit/${editId}`, { replace: true }); return; }
      b.id = editId; setEditing(b);
      const i = b.input; setType(i.type);
      if (i.sessions) setSessions(i.sessions);
      if (i.subscription) setSub(i.subscription as any);
      if (i.nights) setNights(i.nights);
      if (i.customLines) setCustom(i.customLines);
      setGuests(i.guests || ""); setAddOns(Object.fromEntries((i.addOns || []).map(a => [a.id, true])));
      setPurpose(b.purpose); setTitle(b.title); setRequests(b.requests || "");
      setC({ name: b.name, phone: b.phone, email: b.email || "", organisation: b.organisation || "", gstin: b.gstin || "", clientType: b.clientType || "individual", heardFrom: b.heardFrom || "", consent: !!b.marketingConsent });
      if (b.partnerBank) setBank({ ...bank, ...b.partnerBank } as any);
      setR(x => ({ ...x, rateOverride: i.rateOverride?.toString() || "", discountPct: i.discountPct?.toString() || "", discountFlat: i.discountFlat?.toString() || "", discountNote: i.discountNote || "", advancePct: i.advancePct?.toString() || "", waive: i.waiveAddOns || [], source: b.source, sourceDetail: b.sourceDetail || "" }));
    };
    if (DEMO) { api.devList().then(all => fill(all[editId])); return; }
    return onValue(ref(db, `crm/bookings/${editId}`), s => fill(s.val()));
  }, [editId]); // eslint-disable-line

  const input: QuoteInput = useMemo(() => {
    const n = (v: string) => (v === "" ? undefined : Number(v));
    const i: QuoteInput = { type, guests: guests === "" ? undefined : Number(guests), clientGstin: c.gstin || undefined };
    if (type === "venue") i.sessions = sessions;
    if (type === "subscription") i.subscription = sub;
    if (type === "night_subscription") i.nights = nights;
    if (type === "custom") i.customLines = custom.filter(x => x.label);
    if (type === "venue" || type === "custom") i.addOns = Object.entries(addOns).filter(([, v]) => v).map(([id]) => ({ id }));
    if (staff) Object.assign(i, { rateOverride: n(r.rateOverride), discountPct: n(r.discountPct), discountFlat: n(r.discountFlat), discountNote: r.discountNote || undefined, advancePct: n(r.advancePct), waiveAddOns: r.waive.length ? r.waive : undefined });
    return i;
  }, [type, sessions, sub, nights, custom, guests, addOns, c.gstin, r, staff]);

  const quote = useMemo(() => (rc ? computeQuote(input, rc, { today: today || undefined }) : null), [input, rc, today]);

  // Live clash check against the public busy calendar
  const clashes = useMemo(() => {
    if (!rc) return [];
    const mine = expandSessions(input, rc);
    const others = editing ? [] : busy; // when editing, the booking's own slots are in `busy` — skip the check
    const out: { s: Session; b: BusyBlock }[] = [];
    for (const s of mine) { const b = others.find(x => Math.abs(new Date(x.date).getTime() - new Date(s.date).getTime()) <= 864e5 && overlaps(s, x)); if (b) out.push({ s, b }); }
    return out;
  }, [input, busy, rc, editing]);

  if (!rc) return <BookingShell>{err ? <ErrorBox>{err}</ErrorBox> : <Spinner/>}</BookingShell>;

  const minDate = staff ? undefined : today;
  const endTimes = staff ? TIMES : TIMES.filter(t => t > rc.openTime && t <= rc.closeTime);
  const startTimes = staff ? TIMES : TIMES.filter(t => t >= rc.openTime && t < rc.closeTime);
  const busyOn = (d: string) => busy.filter(b => b.date === d);
  const publicAddOns = rc.addOns.filter(a => staff || a.publicVisible);
  const hardClash = clashes.some(x => x.b.state === "booked");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (quote?.warnings.length && !(staff && quote.warnings.every(w => /past/.test(w)))) { setErr(quote.warnings[0]); return; }
    if (!staff && clashes.length) { setErr("Some of your selected time overlaps an existing booking — please change it."); return; }
    setSaving(true);
    const body = {
      ...c, marketingConsent: c.consent, title: title || purpose, purpose, requests, input, website: hp,
      partnerBank: c.clientType === "event_partner" && Object.values(bank).some(Boolean) ? bank : undefined,
      source: r.source, sourceDetail: r.sourceDetail, sendEmail: r.sendEmail,
    };
    try {
      if (editing) {
        await api.update({ id: editing.id, input, patch: { name: c.name, phone: c.phone, email: c.email, organisation: c.organisation, gstin: c.gstin, clientType: c.clientType, title: title || purpose, purpose, requests, source: r.source, sourceDetail: r.sourceDetail, partnerBank: body.partnerBank || "" }, resendQuote: r.sendEmail });
        nav(`/crm?b=${editing.id}`);
      } else {
        const res = await api.create(body, staff);
        if (staff) nav(`/crm?b=${res.booking.id}`); else nav(`/b/${res.booking.id}?new=1`);
      }
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  const TYPES: [BookingType, string, string, any][] = [
    ["venue", "One-time event", "Workshop, shoot, party, meeting — by the hour", CalendarDays],
    ["subscription", "Weekly classes", "Yoga, dance, music… billed monthly", Repeat],
    ["night_subscription", "Late-night plan", `Every Fri & Sat, ${fmtTime(rc.nightStart)}–${fmtTime(rc.nightEnd)}`, Moon],
    ...(staff ? [["custom", "Custom package", "Your own line items (revenue share, corporate…)", Wrench] as any] : []),
  ];

  return (
    <BookingShell>
      <form onSubmit={submit}>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-spice">{editing ? `Editing ${editing.ref}` : staff ? "New booking (rep)" : "Book the space"}</p>
          <h1 className="font-serif text-2xl font-bold">{editing ? editing.name : "Get an instant quote & block your date"}</h1>
          {!staff && <p className="text-sm text-brand-clay mt-1">Takes 2 minutes. Your date is blocked as soon as the advance is paid by UPI.</p>}
        </div>

        <Section n={1} title="What are you booking?">
          <div className="grid grid-cols-1 gap-2">
            {TYPES.map(([t, l, d, Icon]) => (
              <button type="button" key={t} onClick={() => setType(t)}
                className={`flex items-center gap-3 text-left px-3 py-3 rounded-xl border transition-colors ${type === t ? "border-brand-spice bg-brand-spice/5 ring-1 ring-brand-spice" : "border-brand-border bg-white"}`}>
                <Icon size={20} className={type === t ? "text-brand-spice" : "text-brand-muted"}/>
                <span><span className="block font-bold text-sm">{l}</span><span className="block text-xs text-brand-muted">{d}</span></span>
              </button>
            ))}
          </div>
        </Section>

        <Section n={2} title="When?">
          {type === "venue" && <>
            {sessions.map((s, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-brand-sand last:border-0">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <Field label={sessions.length > 1 ? `Date ${i + 1}` : "Date"}>
                    <input type="date" required className="input" min={minDate} value={s.date} onChange={e => setSessions(sessions.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}/>
                  </Field>
                  {sessions.length > 1 && <button type="button" onClick={() => setSessions(sessions.filter((_, j) => j !== i))} className="mb-3 p-3 text-brand-muted hover:text-red-600"><Trash2 size={16}/></button>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From"><select className="input" value={s.start} onChange={e => setSessions(sessions.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}>{startTimes.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></Field>
                  <Field label="To"><select className="input" value={s.end} onChange={e => setSessions(sessions.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}>{endTimes.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></Field>
                </div>
                {s.date && <div className="text-xs">
                  <span className="text-brand-muted">{fmtDate(s.date)} · {sessionHours(s.start, s.end)} hr · </span>
                  {busyOn(s.date).length === 0 ? <span className="text-emerald-700 font-medium">whole day free</span> :
                    <span className="text-brand-clay">already taken: {busyOn(s.date).map(b => `${fmtTime(b.start)}–${fmtTime(b.end)}${b.state === "held" ? " (on hold)" : ""}`).join(", ")}</span>}
                </div>}
              </div>
            ))}
            <button type="button" onClick={() => { const l = sessions[sessions.length - 1]; setSessions([...sessions, { ...l, date: l.date ? addDays(l.date, 1) : "" }]); }}
              className="text-sm font-bold text-brand-spice flex items-center gap-1"><Plus size={16}/> Add another date</button>
          </>}

          {type === "subscription" && <>
            <Field label="Days of the week">
              <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 0].map(d => <Chip key={d} on={sub.days.includes(d)} onClick={() => setSub({ ...sub, days: sub.days.includes(d) ? sub.days.filter(x => x !== d) : [...sub.days, d] })}>{DAY_SHORT[d]}</Chip>)}</div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="From"><select className="input" value={sub.start} onChange={e => setSub({ ...sub, start: e.target.value })}>{startTimes.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></Field>
              <Field label="To"><select className="input" value={sub.end} onChange={e => setSub({ ...sub, end: e.target.value })}>{endTimes.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start date"><input type="date" required className="input" min={minDate} value={sub.startDate} onChange={e => setSub({ ...sub, startDate: e.target.value })}/></Field>
              <Field label="Commitment"><select className="input" value={sub.months} onChange={e => setSub({ ...sub, months: Number(e.target.value) })}>
                <option value={1}>Month to month</option><option value={3}>3 months (best value)</option><option value={6}>6 months</option></select></Field>
            </div>
          </>}

          {type === "night_subscription" && <div className="grid grid-cols-2 gap-2">
            <Field label="Start month"><input type="month" required className="input" min={today.slice(0, 7)} value={nights.startMonth} onChange={e => setNights({ ...nights, startMonth: e.target.value })}/></Field>
            <Field label="Months"><select className="input" value={nights.months} onChange={e => setNights({ ...nights, months: Number(e.target.value) })}>{[1, 2, 3, 6].map(m => <option key={m} value={m}>{m}</option>)}</select></Field>
          </div>}

          {type === "custom" && <>
            {custom.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_90px_auto] gap-2 mb-2">
                <input className="input !py-2 text-sm" placeholder="Item (e.g. Revenue share 40%)" value={l.label} onChange={e => setCustom(custom.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}/>
                <input className="input !py-2 text-sm" type="number" step="any" placeholder="Qty" value={l.qty} onChange={e => setCustom(custom.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))}/>
                <input className="input !py-2 text-sm" type="number" step="any" placeholder="₹ rate" value={l.rate || ""} onChange={e => setCustom(custom.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))}/>
                <button type="button" onClick={() => setCustom(custom.filter((_, j) => j !== i))} className="text-brand-muted"><Trash2 size={14}/></button>
              </div>))}
            <button type="button" onClick={() => setCustom([...custom, { label: "", qty: 1, unit: "", rate: 0 }])} className="text-sm font-bold text-brand-spice flex items-center gap-1 mb-3"><Plus size={16}/> Add line (pre-GST)</button>
            <p className="text-[11px] text-brand-muted mb-2">Calendar dates for custom packages: add them below.</p>
            {sessions.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px] gap-2 mb-2">
                <input type="date" className="input !py-2 text-sm" value={s.date} onChange={e => setSessions(sessions.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}/>
                <select className="input !py-2 text-sm" value={s.start} onChange={e => setSessions(sessions.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}>{TIMES.map(t => <option key={t}>{t}</option>)}</select>
                <select className="input !py-2 text-sm" value={s.end} onChange={e => setSessions(sessions.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}>{TIMES.map(t => <option key={t}>{t}</option>)}</select>
              </div>))}
          </>}

          {clashes.length > 0 && (
            <div className={`mt-3 text-xs rounded-xl px-3 py-2 flex gap-2 ${hardClash ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
              <span>{clashes.length} session{clashes.length > 1 ? "s" : ""} overlap{clashes.length === 1 ? "s" : ""} {hardClash ? "a confirmed booking" : "a booking on hold"} — e.g. {fmtDate(clashes[0].s.date)}, {fmtTime(clashes[0].b.start)}–{fmtTime(clashes[0].b.end)}.{staff ? " (Reps can still save.)" : " Please choose another time."}</span>
            </div>)}
        </Section>

        <Section n={3} title="About your event">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type"><select className="input" value={purpose} onChange={e => setPurpose(e.target.value)}>{PURPOSES.map(p => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Guests (approx.)"><input type="number" min={0} className="input" value={guests} onChange={e => setGuests(e.target.value === "" ? "" : Number(e.target.value))}/></Field>
          </div>
          <Field label="Event / class name (optional)"><input className="input" placeholder="e.g. Healing Workshop" value={title} onChange={e => setTitle(e.target.value)}/></Field>
          {(type === "venue" || type === "custom") && publicAddOns.length > 0 && <Field label="Add-ons">
            <div className="space-y-2">{publicAddOns.map(a => (
              <label key={a.id} className="flex items-start gap-2 text-sm bg-brand-bone rounded-xl px-3 py-2">
                <input type="checkbox" className="mt-1 accent-brand-spice" checked={!!addOns[a.id]} onChange={e => setAddOns({ ...addOns, [a.id]: e.target.checked })}/>
                <span className="flex-1"><b>{a.label}</b> — {inr(a.price)}{a.unit === "per_person" ? " per person" : a.unit === "per_hour" ? " per hour" : ""} + GST<span className="block text-[11px] text-brand-muted">{a.detail}</span></span>
                {staff && addOns[a.id] && <span className="text-[11px]"><input type="checkbox" className="accent-emerald-700" checked={r.waive.includes(a.id)} onChange={e => setR({ ...r, waive: e.target.checked ? [...r.waive, a.id] : r.waive.filter(x => x !== a.id) })}/> waive</span>}
              </label>))}
            </div>
          </Field>}
          <Field label="Anything else we should know?"><textarea className="input" rows={2} placeholder="Set-up needs, equipment, food…" value={requests} onChange={e => setRequests(e.target.value)}/></Field>
        </Section>

        <Section n={4} title="Your details">
          <Field label="Full name"><input required className="input" autoComplete="name" value={c.name} onChange={e => setC({ ...c, name: e.target.value })}/></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mobile (WhatsApp)"><input required type="tel" inputMode="tel" autoComplete="tel" className="input" placeholder="98xxxxxxxx" value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })}/></Field>
            <Field label="Email"><input required={!staff} type="email" autoComplete="email" className="input" value={c.email} onChange={e => setC({ ...c, email: e.target.value })}/></Field>
          </div>
          <Field label="I am">
            <div className="flex flex-wrap gap-2">{[["individual", "An individual"], ["business", "A company"], ["event_partner", "A trainer / event partner"]].map(([v, l]) =>
              <Chip key={v} on={c.clientType === v} onClick={() => { setC({ ...c, clientType: v }); if (v === "business") setShowGst(true); }}>{l}</Chip>)}</div>
          </Field>
          {(c.clientType !== "individual" || showGst) && <div className="grid grid-cols-2 gap-2">
            <Field label="Organisation"><input className="input" value={c.organisation} onChange={e => setC({ ...c, organisation: e.target.value })}/></Field>
            <Field label="GSTIN (for GST invoice)"><input className="input uppercase" maxLength={15} value={c.gstin} onChange={e => setC({ ...c, gstin: e.target.value.toUpperCase() })}/></Field>
          </div>}
          {c.clientType === "individual" && !showGst && <button type="button" className="text-xs text-brand-spice font-bold mb-3" onClick={() => setShowGst(true)}>+ Need a GST invoice?</button>}
          {c.clientType === "event_partner" && <div className="bg-brand-bone rounded-xl p-3 mb-3">
            <p className="text-xs text-brand-clay mb-2">Optional — for revenue-share payouts to you.</p>
            <div className="grid grid-cols-2 gap-2">
              {([["accountName", "Account name"], ["accountNo", "Account number"], ["ifsc", "IFSC"], ["bankName", "Bank"], ["upi", "UPI ID"], ["pan", "PAN"]] as const).map(([k, l]) =>
                <Field key={k} label={l}><input className="input !py-2 text-sm" value={(bank as any)[k]} onChange={e => setBank({ ...bank, [k]: e.target.value })}/></Field>)}
            </div>
          </div>}
          {!staff && <Field label="How did you hear about us?"><select className="input" value={c.heardFrom} onChange={e => setC({ ...c, heardFrom: e.target.value })}>
            <option value="">—</option>{["Instagram", "Facebook", "Google", "WhatsApp", "Friend / referral", "Walked past", "Other"].map(x => <option key={x}>{x}</option>)}</select></Field>}
          <input tabIndex={-1} autoComplete="off" className="hidden" name="website" value={hp} onChange={e => setHp(e.target.value)}/>
          {!staff && <label className="flex gap-2 text-xs text-brand-clay"><input type="checkbox" className="accent-brand-spice" checked={c.consent} onChange={e => setC({ ...c, consent: e.target.checked })}/> Send me Living Roots community events & updates</label>}
        </Section>

        {staff && <Section title="Rep controls" n="★">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Source"><select className="input" value={r.source} onChange={e => setR({ ...r, source: e.target.value })}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Source detail"><input className="input" placeholder="instagram / referrer…" value={r.sourceDetail} onChange={e => setR({ ...r, sourceDetail: e.target.value })}/></Field>
            <Field label={type === "subscription" ? "Rate ₹/session (pre-GST)" : "Rate ₹/hr (pre-GST)"} hint="Overrides the rate card"><input type="number" step="any" className="input" value={r.rateOverride} onChange={e => setR({ ...r, rateOverride: e.target.value })}/></Field>
            <Field label="Advance %" hint={`Default ${rc.advancePct}%`}><input type="number" min={0} max={100} className="input" value={r.advancePct} onChange={e => setR({ ...r, advancePct: e.target.value })}/></Field>
            <Field label="Discount %"><input type="number" step="any" className="input" value={r.discountPct} onChange={e => setR({ ...r, discountPct: e.target.value })}/></Field>
            <Field label="Discount ₹ (pre-GST)"><input type="number" step="any" className="input" value={r.discountFlat} onChange={e => setR({ ...r, discountFlat: e.target.value })}/></Field>
          </div>
          <Field label="Discount reason (shown on quote)"><input className="input" value={r.discountNote} onChange={e => setR({ ...r, discountNote: e.target.value })}/></Field>
          <label className="flex gap-2 text-sm"><input type="checkbox" className="accent-brand-spice" checked={r.sendEmail} onChange={e => setR({ ...r, sendEmail: e.target.checked })}/> Email the quote to the client</label>
        </Section>}

        {quote && quote.lines.length > 0 && <Section title="Your quote">
          <QuoteTable q={quote}/>
          <div className="mt-4"><Schedule q={quote}/></div>
          {quote.notes.length > 0 && <ul className="mt-3 text-[11px] text-brand-muted list-disc pl-4 space-y-1">{quote.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
        </Section>}

        <ErrorBox>{err}</ErrorBox>

        {/* Sticky total + submit */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-brand-border z-40">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {quote && quote.grandTotal > 0 ? <>
                <div className="text-[11px] uppercase tracking-widest text-brand-muted">Total {inr(quote.grandTotal)} · incl. GST</div>
                <div className="font-bold text-brand-earth truncate">Pay {inr2(quote.advance)} now {quote.balance > 0 && <span className="font-normal text-brand-muted text-sm">· {inr(quote.balance)} later</span>}</div>
              </> : <div className="text-sm text-brand-muted">{quote?.warnings[0] || "Fill in the details for an instant quote"}</div>}
            </div>
            <button disabled={saving || !quote || quote.grandTotal <= 0 || (!staff && clashes.length > 0)} className="btn-primary !px-5 whitespace-nowrap flex items-center gap-1">
              {saving ? "Saving…" : editing ? "Save quote" : staff ? "Create" : <>Get quote <CheckCircle2 size={14}/></>}
            </button>
          </div>
        </div>
      </form>
    </BookingShell>
  );
}

