// The 30-second booking form — one question per screen, tap to advance.
//   /book                 clients (link on the site, Instagram, WhatsApp, QR posters). ?src=instagram tags the lead
//   /crm/new              reps (same flow + optional email, source; skips the clash block)
//   /crm/quick-edit/:id   reps edit an existing event booking
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";
import { api, DEMO } from "../client/api";
import type { RateCard } from "../shared/rateCard";
import type { Booking, BusyBlock, EventSpec } from "../shared/types";
import { computeQuote } from "../shared/pricing";
import { addDays, dow, fmtDate, fromMin, inr, parseYMD, toMin, todayIST } from "../shared/dates";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";

type StepId = "date" | "start" | "len" | "guests" | "need" | "tickets" | "setup" | "first" | "often" | "you" | "quote";
const DL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const t12 = (m: number) => { m = ((m % 1440) + 1440) % 1440; const H = Math.floor(m / 60), mm = m % 60; return `${((H + 11) % 12) + 1}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${H < 12 ? "am" : "pm"}`; };
const dur = (m: number) => m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m / 60} hr`;
const dShort = (d: string) => { const x = parseYMD(d); return `${DL[x.getUTCDay()].slice(0, 3)} ${x.getUTCDate()} ${MN[x.getUTCMonth()]}`; };

const NEED = {
  space: { l: "Space for my event", s: "Workshop, class, party, shoot, meeting", i: "S" },
  both: { l: "Space + sell tickets with us", s: "₹1,500/hr and you keep 60% of ticket sales", i: "T" },
  tix: { l: "Only sell tickets with us", s: "We list and sell it, you keep 60%", i: "₹" },
} as const;

interface S { date: string; start: number | null; len: number | null; guests: 0 | 1 | 2 | null; need: EventSpec["need"] | null; tp: number | null; tn: number | null; pre: number; post: number; first: boolean | null; one: boolean | null; name: string; phone: string; email: string }
const EMPTY: S = { date: "", start: null, len: null, guests: null, need: null, tp: null, tn: null, pre: 0, post: 0, first: null, one: null, name: "", phone: "", email: "" };

export default function QuickBook({ mode }: { mode: "public" | "staff" }) {
  const staff = mode === "staff";
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { id: editId } = useParams();
  const [rc, setRc] = useState<RateCard | null>(null);
  const [busy, setBusy] = useState<BusyBlock[]>([]);
  const [today, setToday] = useState(todayIST());
  const [s, setS] = useState<S>({ ...EMPTY, date: /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? params.get("date")! : "" });
  const [cur, setCur] = useState(0);
  const [weeks, setWeeks] = useState(5);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [source, setSource] = useState(params.get("src") ? "social" : staff ? "rep" : "website");

  useEffect(() => { api.config().then(x => { setRc(x.rateCard); setBusy(x.busy); setToday(x.today); }).catch(e => setErr(`Couldn't load availability: ${e.message}`)); }, []);

  // Rep editing an existing event booking
  useEffect(() => {
    if (!editId) return;
    const fill = (b: Booking) => {
      const e = b?.input?.event; if (!e || editing) return;
      setEditing({ ...b, id: editId });
      const st = toMin(e.start), len = ((toMin(e.end) - st + 1440) % 1440 || 1440) / 60;
      setS({ date: e.date, start: st, len, guests: e.guestsTier, need: e.need, tp: e.ticketPrice ?? null, tn: e.ticketsExpected ?? null, pre: e.preMin, post: e.postMin, first: e.firstTime, one: e.oneTime, name: b.name, phone: b.phone, email: b.email || "" });
      setSource(b.source);
    };
    if (DEMO) { api.devList().then(all => fill(all[editId])); return; }
    return onValue(ref(db, `crm/bookings/${editId}`), snap => fill(snap.val()));
  }, [editId]); // eslint-disable-line

  // Busy blocks in minutes for a date (other bookings only when editing)
  const busyOn = (date: string, a: number, b: number) => {
    if (!date || (staff && editing)) return false;        // reps editing can override (their own slot shows as busy)
    return busy.some(x => {
      const xs = toMin(x.start), xe0 = toMin(x.end), xe = xe0 > xs ? xe0 : xe0 + 1440;
      const off = x.date === date ? 0 : x.date === addDays(date, -1) ? -1440 : x.date === addDays(date, 1) ? 1440 : null;
      return off != null && xs + off < b && xe + off > a;
    });
  };

  const spec: EventSpec | null = s.date && s.start != null && s.len != null && s.guests != null && s.need ? {
    date: s.date, start: fromMin(s.start), end: fromMin(s.start + s.len * 60), guestsTier: s.guests, need: s.need,
    preMin: s.pre, postMin: s.post, firstTime: !!s.first, oneTime: s.one !== false, ticketPrice: s.tp ?? undefined, ticketsExpected: s.tn ?? undefined,
  } : null;
  const quote = useMemo(() => (rc && spec ? computeQuote({ type: "event", event: spec }, rc, { today }) : null), [rc, JSON.stringify(spec), today]); // eslint-disable-line

  const steps: { id: StepId; k: string; v: string; hide?: boolean }[] = [
    { id: "date", k: "Date", v: s.date ? dShort(s.date) : "" },
    { id: "start", k: "Starts", v: s.start != null ? t12(s.start) : "" },
    { id: "len", k: "Length", v: s.len != null && s.start != null ? `${s.len} hr · till ${t12(s.start + s.len * 60)}` : "" },
    { id: "guests", k: "Guests", v: s.guests != null && rc ? rc.tierLabels[s.guests] : "" },
    { id: "need", k: "You need", v: s.need ? NEED[s.need].l : "" },
    ...(s.need && s.need !== "space" ? [{ id: "tickets" as StepId, k: "Tickets", v: s.tp != null ? `${s.tp ? inr(s.tp) : "Free"}${s.tn ? ` × ${s.tn}` : ""}` : "" }] : []),
    { id: "setup", k: "Set-up / wrap-up", v: s.len != null ? (s.pre || s.post ? `${dur(s.pre)} / ${dur(s.post)}` : "None") : "" },
    { id: "first", k: "First event here", v: s.first == null ? "" : s.first ? "Yes" : "No" },
    { id: "often", k: "How often", v: s.one == null ? "" : s.one ? "One-time" : "Regularly" },
    { id: "you", k: "You", v: s.name },
    { id: "quote", k: "Quote", v: "", hide: true },
  ];
  const step = steps[Math.min(cur, steps.length - 1)];
  const visible = steps.filter(x => !x.hide);
  const next = () => { setCur(c => Math.min(c + 1, steps.length - 1)); window.scrollTo({ top: 0 }); };
  const back = () => { setCur(c => Math.max(0, c - 1)); window.scrollTo({ top: 0 }); };
  const jump = (id: StepId) => { const i = steps.findIndex(x => x.id === id); if (i <= cur || steps[i].v) { setCur(i); window.scrollTo({ top: 0 }); } };
  const pick = (patch: Partial<S>) => { setS(p => ({ ...p, ...patch })); setTimeout(next, 200); };

  async function submit() {
    if (!rc || !spec || !quote) return;
    setErr(""); setSaving(true);
    try {
      const title = s.need === "space" ? "Event" : "Ticketed event";
      if (editing) {
        await api.update({ id: editing.id, input: { type: "event", event: spec }, patch: { name: s.name, phone: s.phone, email: s.email, source }, resendQuote: false });
        nav(`/crm?b=${editing.id}`); return;
      }
      const res = await api.create({ name: s.name, phone: s.phone, email: s.email || undefined, title, purpose: title, input: { type: "event", event: spec }, source, sourceDetail: params.get("src") || undefined, website: "" }, staff);
      nav(staff ? `/crm?b=${res.booking.id}` : `/b/${res.booking.id}?new=1`);
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  if (!rc) return <div className="min-h-screen bg-brand-bone flex items-center justify-center text-brand-muted text-sm">{err || <Loader2 className="animate-spin text-brand-spice"/>}</div>;
  const wd = s.date ? dow(s.date) > 0 && dow(s.date) < 6 : false;
  const wa = (rc.phone || "").replace(/\D/g, "");

  // ── Shared bits ──
  const H = ({ t, hint }: { t: string; hint?: string }) => <>
    <h2 className="font-serif text-[clamp(28px,4vw,40px)] leading-[1.1] text-brand-earth mt-3 mb-1.5 text-balance">{t}</h2>
    {hint && <p className="text-brand-muted text-[15px] mb-5">{hint}</p>}
  </>;
  const Opt = ({ on, onClick, disabled, children, center, className = "" }: { on?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; center?: boolean; className?: string }) =>
    <button type="button" disabled={disabled} onClick={onClick}
      className={`min-h-[52px] rounded-2xl border-[1.5px] bg-white text-brand-earth transition-colors ${center ? "text-center px-1 py-2" : "text-left px-4 py-3.5"} ${on ? "border-brand-spice bg-[#FBEDE4]" : "border-[#DCCDB4] hover:border-brand-spice"} disabled:opacity-40 disabled:line-through disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand-gold ${className}`}>{children}</button>;
  const Go = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) =>
    <button type="button" disabled={disabled} onClick={onClick} className="block w-full mt-5 min-h-[54px] rounded-full bg-brand-spice hover:bg-[#A9501F] text-white font-semibold text-base disabled:opacity-60">{children}</button>;
  const Sec = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-brand-muted mt-5 mb-2">{children}</p>;

  // ── Steps ──
  const body = (() => {
    switch (step.id) {
      case "date": {
        const first = today, lead = (dow(first) + 6) % 7, days = Array.from({ length: weeks * 7 - lead }, (_, i) => addDays(first, i));
        return <>
          <H t="When is your event?" hint="Days with a dot already have some bookings."/>
          <div className="grid grid-cols-7 gap-1.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="text-center text-xs text-brand-muted pb-0.5">{d}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={"x" + i}/>)}
            {days.map(d => { const x = parseYMD(d); const has = busy.some(b => b.date === d);
              return <Opt key={d} center on={s.date === d} onClick={() => pick({ date: d, ...(s.start != null && busyOn(d, s.start, s.start + (s.len || 1) * 60) ? { start: null, len: null } : {}) })} className="!min-h-[62px] !rounded-xl">
                <span className="block text-[11px] text-brand-muted">{x.getUTCDate() === 1 || d === first ? MN[x.getUTCMonth()] : " "}</span>
                <span className="block font-serif text-xl leading-tight">{x.getUTCDate()}</span>
                {has && <span className="block w-1.5 h-1.5 rounded-full bg-brand-gold mx-auto mt-0.5"/>}
              </Opt>; })}
          </div>
          <button className="mt-3 text-brand-spice underline text-sm" onClick={() => setWeeks(w => w + 4)}>Show later dates</button>
        </>;
      }
      case "start":
        return <>
          <H t="What time does it start?" hint={`${DL[dow(s.date)]}, ${fmtDate(s.date, false)} · ${wd ? "weekday" : "weekend"}. Crossed-out times are taken.`}/>
          {([["Morning", 7, 12], ["Afternoon", 12, 17], ["Evening", 17, 22.5]] as const).map(([l, a, z]) => <div key={l}>
            <Sec>{l}</Sec>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {Array.from({ length: (z - a) * 2 }, (_, i) => (a + i / 2) * 60).map(m =>
                <Opt key={m} center on={s.start === m} disabled={busyOn(s.date, m, m + 30) || (s.date === today && m <= nowMin())} onClick={() => pick({ start: m, ...(s.len && busyOn(s.date, m, m + s.len * 60) ? { len: null } : {}) })} className="!min-h-[48px] !rounded-xl text-[15px] font-medium">{t12(m)}</Opt>)}
            </div>
          </div>)}
        </>;
      case "len":
        return <>
          <H t="How long is the event?" hint={`Starts ${t12(s.start!)}. Set-up time comes later.`}/>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {[1, 1.5, 2, 3, 4, 5, 6, 8].map(n => <Opt key={n} center on={s.len === n} disabled={busyOn(s.date, s.start!, s.start! + n * 60) || s.start! + n * 60 > 1440} onClick={() => pick({ len: n })}>
              <b className="block font-semibold text-[17px]">{n} hr</b><small className="block text-brand-muted text-[13px]">till {t12(s.start! + n * 60)}</small></Opt>)}
          </div>
        </>;
      case "guests":
        return <>
          <H t="How many people are you expecting?"/>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {rc.tierLabels.map((l, i) => <Opt key={l} on={s.guests === i} onClick={() => pick({ guests: i as 0 | 1 | 2 })}>
              <b className="block font-semibold text-[17px]">{l}</b><small className="block text-brand-muted text-[13px]">{inr(rc.tierHourly[i])} per hr + GST</small></Opt>)}
          </div>
        </>;
      case "need":
        return <>
          <H t="What do you need from us?"/>
          <div className="grid gap-2.5">
            {(Object.keys(NEED) as (keyof typeof NEED)[]).map(k => <Opt key={k} on={s.need === k} onClick={() => pick({ need: k, ...(k === "space" ? { tp: null, tn: null } : {}) })}>
              <span className="flex items-center gap-3.5"><span className="w-11 h-11 rounded-xl bg-brand-sand grid place-items-center font-serif italic text-xl text-[#A9501F] flex-none">{NEED[k].i}</span>
                <span><b className="block font-semibold text-[17px]">{NEED[k].l}</b><small className="block text-brand-muted text-[13px]">{NEED[k].s}</small></span></span></Opt>)}
          </div>
          <a className="inline-block mt-3 text-[#A9501F] underline" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi Living Roots, I'd like to host an event and have a question.")}`}>Not sure? Chat with us on WhatsApp</a>
        </>;
      case "tickets": {
        const g = (s.tp || 0) * (s.tn || 0), you = 100 - rc.ticketShareLrPct;
        return <>
          <H t="Ticket price and expected sales" hint="So we can show what you'll earn. Rough numbers are fine."/>
          <Sec>Price per ticket</Sec>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{[0, 299, 499, 999, 1499].map(v => <Opt key={v} center on={s.tp === v} onClick={() => setS({ ...s, tp: v })}><b className="font-semibold">{v ? inr(v) : "Free"}</b></Opt>)}</div>
          <Sec>Tickets you expect to sell</Sec>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{[10, 20, 30, 50, 80, 120].map(v => <Opt key={v} center on={s.tn === v} onClick={() => setS({ ...s, tn: v })}><b className="font-semibold">{v}</b></Opt>)}</div>
          {g > 0 && <div className="mt-3 rounded-2xl px-4 py-3 text-sm bg-[#E6F1E4] text-[#1F4D2C]">Sales of {inr(g)}: you earn {inr(g * you / 100)} ({you}%), Living Roots keeps {inr(g * rc.ticketShareLrPct / 100)} ({rc.ticketShareLrPct}%), settled after the event.</div>}
          <Go onClick={next}>{s.tp != null && s.tn ? "Continue" : "Skip for now"}</Go>
        </>;
      }
      case "setup": {
        const st = s.start!, en = s.start! + s.len! * 60;
        const Row = ({ k, label }: { k: "pre" | "post"; label: string }) => {
          const v = s[k]; const more = k === "pre" ? busyOn(s.date, st - v - 15, st) : busyOn(s.date, en, en + v + 15);
          return <div className="flex items-center justify-between gap-3 bg-white border-[1.5px] border-[#DCCDB4] rounded-2xl px-3.5 py-3 mb-2.5">
            <div><b className="block font-semibold">{label}</b><small className="text-brand-muted text-[13px]">{k === "pre" ? `from ${t12(st - v)}` : `till ${t12(en + v)}`}{more ? " · next slot is booked" : ""}</small></div>
            <div className="flex items-center gap-1.5">
              <button aria-label={`Less ${label}`} disabled={v === 0} onClick={() => setS({ ...s, [k]: v - 15 })} className="w-11 h-11 rounded-full border-[1.5px] border-[#DCCDB4] bg-brand-bone text-xl disabled:opacity-35">−</button>
              <span className="min-w-[76px] text-center font-serif text-lg">{v ? dur(v) : "None"}</span>
              <button aria-label={`More ${label}`} disabled={v >= 240 || more} onClick={() => setS({ ...s, [k]: v + 15 })} className="w-11 h-11 rounded-full border-[1.5px] border-[#DCCDB4] bg-brand-bone text-xl disabled:opacity-35">+</button>
            </div></div>;
        };
        return <>
          <H t="Need time to set up or wrap up?" hint={`The first ${rc.freeBufferMin} minutes on each side are free when the space is empty. Extra time is charged at your hourly rate.`}/>
          <Row k="pre" label="Before the event"/><Row k="post" label="After the event"/>
          <Go onClick={next}>{s.pre || s.post ? "Continue" : "No extra time needed"}</Go>
        </>;
      }
      case "first":
        return <>
          <H t="Is this your first event at Living Roots?" hint={`First-timers get ${rc.firstTimerPct}% off on weekdays between ${t12(toMin(rc.offerStart))} and ${t12(toMin(rc.offerEnd))}.`}/>
          <div className="grid grid-cols-2 gap-2.5">
            <Opt center on={s.first === true} onClick={() => pick({ first: true })}><b className="font-semibold">Yes, first time</b></Opt>
            <Opt center on={s.first === false} onClick={() => pick({ first: false })}><b className="font-semibold">Been here before</b></Opt>
          </div>
        </>;
      case "often":
        return <>
          <H t="Is this a one-time event?"/>
          <div className="grid grid-cols-2 gap-2.5">
            <Opt center on={s.one === true} onClick={() => pick({ one: true })}><b className="block font-semibold">One-time</b><small className="text-brand-muted text-[13px]">Just this date</small></Opt>
            <Opt center on={s.one === false} onClick={() => pick({ one: false })}><b className="block font-semibold">Regularly</b><small className="text-brand-muted text-[13px]">Show me subscription plans</small></Opt>
          </div>
        </>;
      case "you":
        return <form noValidate onSubmit={e => { e.preventDefault(); const n = s.name.trim(), p = s.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
          if (!n) return setErr("Add your name"); if (p.length !== 10) return setErr("Add a 10-digit WhatsApp number"); setErr(""); setS({ ...s, name: n, phone: p }); next(); }}>
          <H t="Where should we send your quote?" hint="We share the quote, payment link and reminders on WhatsApp."/>
          <label className="block text-sm text-brand-muted mb-1.5" htmlFor="qb-name">Your name</label>
          <input id="qb-name" autoFocus autoComplete="name" placeholder="Priya Sharma" value={s.name} onChange={e => { setErr(""); setS({ ...s, name: e.target.value }); }} className="w-full min-h-[54px] rounded-2xl border-[1.5px] border-[#DCCDB4] px-4 text-base bg-white mb-3.5 focus:outline focus:outline-[3px] focus:outline-brand-gold"/>
          <label className="block text-sm text-brand-muted mb-1.5" htmlFor="qb-phone">WhatsApp number</label>
          <input id="qb-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98450 12345" value={s.phone} onChange={e => { setErr(""); setS({ ...s, phone: e.target.value }); }} className="w-full min-h-[54px] rounded-2xl border-[1.5px] border-[#DCCDB4] px-4 text-base bg-white mb-3.5 focus:outline focus:outline-[3px] focus:outline-brand-gold"/>
          {staff && <>
            <label className="block text-sm text-brand-muted mb-1.5" htmlFor="qb-email">Email (optional)</label>
            <input id="qb-email" type="email" value={s.email} onChange={e => setS({ ...s, email: e.target.value })} className="w-full min-h-[54px] rounded-2xl border-[1.5px] border-[#DCCDB4] px-4 text-base bg-white mb-3.5"/>
            <label className="block text-sm text-brand-muted mb-1.5" htmlFor="qb-src">Lead source</label>
            <select id="qb-src" value={source} onChange={e => setSource(e.target.value)} className="w-full min-h-[54px] rounded-2xl border-[1.5px] border-[#DCCDB4] px-4 text-base bg-white mb-3.5">
              {[["rep", "Rep / phone"], ["whatsapp", "WhatsApp"], ["social", "Social media"], ["walk_in", "Walk-in"], ["referral", "Referral"], ["website", "Website"], ["other", "Other"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></>}
          <p className="text-red-700 text-sm min-h-5">{err}</p>
          <button type="submit" className="block w-full mt-3 min-h-[54px] rounded-full bg-brand-spice hover:bg-[#A9501F] text-white font-semibold">See my quote</button>
        </form>;
      case "quote": {
        if (!quote || !spec) return null;
        const bal = quote.schedule.find(x => x.kind === "balance");
        const tixNote = quote.notes.find(n => n.startsWith("Ticket sales")), offerNote = quote.notes.find(n => n.startsWith("The first-timer offer")), subNote = quote.notes.find(n => n.startsWith("You asked"));
        return <>
          <H t={editing ? "Updated quote" : `Your quote, ${s.name.split(" ")[0]}`} hint={`${DL[dow(s.date)]} ${fmtDate(s.date, false)}, ${t12(s.start!)} to ${t12(s.start! + s.len! * 60)} · ${rc.tierLabels[s.guests!].toLowerCase()} guests`}/>
          <div className="bg-white border-[1.5px] border-[#DCCDB4] rounded-[20px] px-5 py-4">
            {quote.lines.map((l, i) => <div key={i} className={`flex justify-between gap-3.5 py-2 border-b border-dashed border-brand-sand text-[15px] ${l.amount < 0 ? "text-[#1F7A4D]" : ""}`}>
              <span>{l.label}<small className="block text-brand-muted text-[13px]">{l.detail?.replace(/^[A-Za-z]+, \d+ \w+ \d{4} · [^·]+· /, "")}</small></span>
              <span className="whitespace-nowrap text-right">{l.amount < 0 ? "−" : ""}{inr(Math.abs(l.amount))}</span></div>)}
            <div className="flex justify-between py-2 border-b border-dashed border-brand-sand text-[15px]"><span>GST {Math.round(rc.gstRate * 100)}%</span><span>{inr(quote.gst)}</span></div>
            <div className="flex justify-between pt-3 font-serif text-2xl"><span>Total</span><span>{inr(quote.total)}</span></div>
          </div>
          {tixNote && <div className="mt-3 rounded-2xl px-4 py-3 text-sm bg-[#E6F1E4] text-[#1F4D2C]">{tixNote}</div>}
          {offerNote && <div className="mt-3 rounded-2xl px-4 py-3 text-sm bg-[#FAEEDA] text-[#633806]">{offerNote}</div>}
          {subNote && <div className="mt-3 rounded-2xl px-4 py-3 text-sm bg-[#FAEEDA] text-[#633806]">Hosting regularly? Our subscription plans cost much less per session. We'll WhatsApp you the options.</div>}
          {quote.advance > 0 && <div className="flex justify-between items-center gap-2.5 mt-3.5 px-4 py-3.5 bg-brand-earth text-white rounded-2xl">
            <div><small className="block text-[#CDBBA5] text-[13px]">Pay now to block your date</small><span className="font-serif text-[26px]">{inr(quote.advance)}</span></div>
            {bal && <div className="text-right text-[13px] text-[#CDBBA5]">Balance {inr(bal.amount)}<br/>due {fmtDate(bal.dueDate, false)}</div>}</div>}
          <p className="text-red-700 text-sm mt-2">{err}</p>
          <Go onClick={submit} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : staff ? "Create booking" : quote.advance > 0 ? `Continue to pay ${inr(quote.advance)}` : "List my event"}</Go>
          <p className="text-brand-muted text-[13px] mt-3.5">Date changes are possible to any open slot for ₹{rc.rescheduleFee} + GST. Quote valid for {rc.quoteValidDays} days, subject to availability until the advance is paid.</p>
        </>;
      }
    }
  })();

  const total = quote && quote.total > 0 ? quote : null;
  return (
    <div className="min-h-screen bg-brand-bone text-brand-earth lg:grid lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* Booking slip (wide screens) */}
      <aside className="hidden lg:flex flex-col gap-5 bg-brand-earth text-brand-bone px-7 py-8 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2.5"><span className="w-9 h-9 border border-brand-gold rounded-[10px] grid place-items-center text-brand-gold font-serif italic font-bold">LR</span><span className="font-serif text-xl">Living Roots</span></Link>
        <div><h1 className="font-serif text-[30px] leading-[1.1] mt-2 text-balance">{editing ? `Editing ${editing.ref}` : staff ? "New booking" : "Block your date in 30 seconds"}</h1><p className="text-[#CDBBA5] text-[15px]">JP Nagar 5th Phase, Bengaluru</p></div>
        <div className="flex flex-col border-t border-brand-gold/25">
          {visible.map(x => <button key={x.id} onClick={() => jump(x.id)} className="flex justify-between gap-3 py-2.5 border-b border-brand-gold/15 text-sm text-left group">
            <span className="text-[#B9A58E]">{x.k}</span><span className={`text-right ${x.v ? "group-hover:text-brand-gold" : "text-[#6E5A4A]"}`}>{x.v || "—"}</span></button>)}
        </div>
        <div className="mt-auto pt-3.5 border-t border-brand-gold/40">
          {total ? <><div className="text-[13px] text-[#B9A58E]">Estimated total incl. GST</div><div className="font-serif text-[34px] leading-tight text-white">{inr(total.total)}</div><div className="text-sm text-brand-gold">{inr(total.advance)} now blocks your date</div></>
            : <div className="text-[13px] text-[#B9A58E]">Your price appears as you tap</div>}
        </div>
      </aside>

      <main className="flex flex-col min-h-screen">
        <div className="flex items-center gap-3 px-[clamp(16px,5vw,56px)] py-4">
          <button onClick={back} aria-label="Back" className={`w-11 h-11 rounded-full border border-[#DCCDB4] bg-white text-lg grid place-items-center ${cur === 0 ? "invisible" : ""}`}><ArrowLeft size={18}/></button>
          <Link to="/" className="lg:hidden flex items-center gap-2 font-serif text-lg whitespace-nowrap"><span className="w-[30px] h-[30px] border border-brand-spice text-brand-spice rounded-lg grid place-items-center italic text-[13px] font-bold">LR</span><span className="hidden min-[380px]:inline">Living Roots</span></Link>
          <div className="flex-1 h-1 bg-brand-sand rounded overflow-hidden"><i className="block h-full bg-brand-spice transition-all" style={{ width: `${Math.round(cur / (steps.length - 1) * 100)}%` }}/></div>
          {!step.hide && <span className="text-[13px] text-brand-muted whitespace-nowrap">{cur + 1} of {visible.length}</span>}
        </div>
        <section key={step.id} className="flex-1 w-full max-w-[760px] px-[clamp(16px,5vw,56px)] pb-10 animate-fade-in">{body}</section>
        {!step.hide && <a className="lg:hidden text-center text-sm text-[#A9501F] underline pb-4 flex items-center justify-center gap-1" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}`}><MessageCircle size={14}/> Questions? WhatsApp us</a>}
        {!step.hide && total && <div className="lg:hidden sticky bottom-0 bg-brand-earth text-white px-[18px] pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex justify-between items-center gap-2.5">
          <div><small className="block text-[#CDBBA5] text-xs">Estimated total incl. GST</small><span className="font-serif text-[22px]">{inr(total.total)}</span></div>
          <div className="text-brand-gold text-sm text-right">Pay {inr(total.advance)}<br/>to block</div></div>}
      </main>
    </div>
  );
}

function nowMin() { const d = new Date(Date.now() + 330 * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
