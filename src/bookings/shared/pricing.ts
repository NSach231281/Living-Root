// ─────────────────────────────────────────────────────────────────────────────
// Quote engine. Pure functions: same result in the browser (instant quote) and
// on the server (authoritative price saved to the CRM).
// ─────────────────────────────────────────────────────────────────────────────
import type { EventSpec, QuoteInput, Quote, QuoteLine, Installment, Session, Booking, Payment, MoneyStatus, BusyBlock } from "./types.js";
import type { RateCard } from "./rateCard.js";
import {
  addDays, addMonths, dow, fmtDate, fmtTime, isWeekend, monthLabel, parseYMD, round2,
  sessionHours, todayIST, toMin, fromMin, ymd, DAY_SHORT, inr,
} from "./dates.js";

/** Event length in minutes (end may be past midnight). */
export function eventMinutes(e: { start: string; end: string }): number {
  const d = toMin(e.end) - toMin(e.start); return d > 0 ? d : d + 1440;
}

/** Pricing for the 30-second form. Returns lines (pre-GST) plus explanations. */
export function eventPricing(e: EventSpec, rc: RateCard, rateOverride?: number) {
  const lines: QuoteLine[] = []; const notes: string[] = [];
  const h = round2(eventMinutes(e) / 60);
  const tier = Math.max(0, Math.min(rc.tierHourly.length - 1, e.guestsTier || 0));
  const tierLabel = (rc.tierLabels[tier] || "").toLowerCase();
  let rate: number, label: string;
  if (e.need === "space") { rate = rc.tierHourly[tier]; label = `Venue hire · ${tierLabel} guests`; }
  else if (e.need === "both") { rate = rc.ticketingHourly; label = "Venue hire · ticketing partner rate"; }
  else { rate = h > 1 ? rc.ticketingHourly : 0; label = "Space rental"; }
  if (rateOverride != null) rate = rateOverride;
  const wd = !isWeekend(e.date);
  const winA = toMin(e.start) - (e.preMin || 0), winB = toMin(e.start) + eventMinutes(e) + (e.postMin || 0);
  const inWindow = winA >= toMin(rc.offerStart) && winB <= toMin(rc.offerEnd);
  const offer = e.need !== "tix" && e.firstTime && wd && inWindow && rate > 0 && rc.firstTimerPct > 0;
  const eff = offer ? round2(rate * (1 - rc.firstTimerPct / 100)) : rate;
  const when = `${fmtDate(e.date)} · ${fmtTime(e.start)} – ${fmtTime(fromMin(toMin(e.start) + eventMinutes(e)))}`;
  if (rate > 0) lines.push({ label, detail: `${when} · ${h} hr × ${inr(rate)}`, qty: h, unit: "hr", rate, standardRate: rate, amount: round2(h * rate) });
  else lines.push({ label, detail: `${when} · not charged for events of 1 hr or less`, qty: h, unit: "hr", rate: 0, standardRate: 0, amount: 0 });
  if (offer) lines.push({ label: `First-timer weekday offer (${rc.firstTimerPct}% off)`, detail: `Standard ${inr(rate)}/hr → ${inr(eff)}/hr for your first event on a weekday, ${fmtTime(rc.offerStart)}–${fmtTime(rc.offerEnd)}`, qty: 1, unit: "", rate: 0, amount: -round2(h * (rate - eff)) });
  else if (e.need !== "tix" && e.firstTime) notes.push(!wd ? "The first-timer offer applies to Monday–Friday bookings." : `The first-timer offer applies when the whole booking is within ${fmtTime(rc.offerStart)}–${fmtTime(rc.offerEnd)}.`);
  const free = rc.freeBufferMin;
  const extra = Math.max(0, (e.preMin || 0) - free) + Math.max(0, (e.postMin || 0) - free);
  if (e.preMin || e.postMin) {
    const xh = round2(extra / 60);
    lines.push({ label: "Set-up and wrap-up", detail: `${e.preMin || 0} min before, ${e.postMin || 0} min after · first ${free} min each side free${extra ? ` · ${extra} min charged at ${inr(eff)}/hr` : ""}`, qty: xh, unit: "hr", rate: eff, standardRate: eff, amount: round2(xh * eff) });
  }
  if (e.need !== "space") {
    const g = (e.ticketPrice || 0) * (e.ticketsExpected || 0);
    notes.push(`Ticket sales through our platform: you keep ${100 - rc.ticketShareLrPct}%, Living Roots keeps ${rc.ticketShareLrPct}%, settled after the event${g ? ` (on ₹${g.toLocaleString("en-IN")} of sales: you earn ₹${Math.round(g * (100 - rc.ticketShareLrPct) / 100).toLocaleString("en-IN")})` : ""}.`);
  }
  if (!e.oneTime) notes.push("You asked about hosting regularly — our team will WhatsApp you subscription plans.");
  return { lines, notes, offer, hours: h };
}

// ── Session expansion (used for pricing, calendar, availability, reminders) ──

export function expandSessions(input: QuoteInput, rc: RateCard): Session[] {
  switch (input.type) {
    case "event": {
      const e = input.event; if (!e?.date || !e.start || !e.end) return [];
      const a = toMin(e.start) - (e.preMin || 0), z = toMin(e.start) + eventMinutes(e) + (e.postMin || 0);
      return [{ date: a < 0 ? addDays(e.date, -1) : e.date, start: fromMin(a), end: fromMin(z) }];
    }
    case "venue":
    case "custom":
      return [...(input.sessions || [])].filter(s => s.date && s.start && s.end).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    case "subscription": {
      const s = input.subscription; if (!s?.startDate || !s.days?.length) return [];
      const end = addMonths(s.startDate, Math.max(1, s.months || 1));
      const out: Session[] = [];
      for (let d = s.startDate; d < end; d = addDays(d, 1)) if (s.days.includes(dow(d))) out.push({ date: d, start: s.start, end: s.end });
      return out;
    }
    case "night_subscription": {
      const n = input.nights; if (!n?.startMonth) return [];
      const out: Session[] = [];
      for (let i = 0; i < Math.max(1, n.months || 1); i++) {
        const first = addMonths(`${n.startMonth}-01`, i); const next = addMonths(first, 1);
        for (let d = first; d < next; d = addDays(d, 1)) if (rc.nightDays.includes(dow(d))) out.push({ date: d, start: rc.nightStart, end: rc.nightEnd });
      }
      return out;
    }
  }
  return [];
}

function nightsByMonth(input: QuoteInput, rc: RateCard) {
  const n = input.nights!; const months: { ym: string; nights: string[] }[] = [];
  for (let i = 0; i < Math.max(1, n.months || 1); i++) {
    const first = addMonths(`${n.startMonth}-01`, i); const next = addMonths(first, 1);
    const nights: string[] = [];
    for (let d = first; d < next; d = addDays(d, 1)) if (rc.nightDays.includes(dow(d))) nights.push(d);
    months.push({ ym: first.slice(0, 7), nights });
  }
  return months;
}

// ── Quote ────────────────────────────────────────────────────────────────────

export function computeQuote(input: QuoteInput, rc: RateCard, opts: { today?: string } = {}): Quote {
  const today = opts.today || todayIST();
  const lines: QuoteLine[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const sessions = expandSessions(input, rc);
  const totalHours = sessions.reduce((s, x) => s + sessionHours(x.start, x.end), 0);
  let schedulePlan: { label: string; kind: Installment["kind"]; amountIncl?: number; pct?: number; dueDate: string }[] | null = null;
  let deposit = 0;

  if (input.type === "event") {
    const e = input.event;
    if (!e?.date || !e.start || !e.end) warnings.push("Pick a date and time.");
    else {
      const p = eventPricing(e, rc, input.rateOverride);
      lines.push(...p.lines); notes.push(...p.notes);
    }
  }

  if (input.type === "venue") {
    if (!sessions.length) warnings.push("Pick at least one date and time.");
    for (const s of sessions) {
      const h = round2(sessionHours(s.start, s.end));
      if (h < rc.minHours) warnings.push(`Minimum booking is ${rc.minHours} hour(s).`);
      const wk = isWeekend(s.date);
      const rate = input.rateOverride ?? (wk ? rc.weekendHourly : rc.weekdayHourly);
      lines.push({
        label: `Venue — ${fmtDate(s.date)}`,
        detail: `${fmtTime(s.start)} – ${fmtTime(s.end)} · ${h} hr · ${wk ? "weekend" : "weekday"} rate`,
        qty: h, unit: "hr", rate, standardRate: rc.standardHourly, amount: round2(h * rate),
      });
      if (h >= rc.longBookingHours && rc.longBookingDiscountPct > 0 && input.rateOverride == null) {
        lines.push({ label: `Long-booking discount (${rc.longBookingDiscountPct}%)`, detail: `${rc.longBookingHours}+ hour booking`, qty: 1, unit: "", rate: 0, amount: -round2(h * rate * rc.longBookingDiscountPct / 100) });
      }
    }
  }

  if (input.type === "subscription") {
    const s = input.subscription;
    if (!s?.days?.length || !s.startDate) warnings.push("Pick the days of the week and a start date.");
    else {
      const h = sessionHours(s.start, s.end);
      const perMonth = s.days.length * rc.weeksPerMonth;
      const months = Math.max(1, s.months || 1);
      const stdMonthly = perMonth * h * rc.standardHourly;
      let monthlyIncl: number;
      if (input.rateOverride != null) monthlyIncl = round2(perMonth * input.rateOverride * (1 + rc.gstRate));
      else {
        const extra = months >= 3 ? rc.subscription3MonthExtraPct : rc.subscription1MonthExtraPct;
        const pre = stdMonthly * (1 - rc.subscriptionDiscountPct / 100) * (1 - extra / 100);
        const step = rc.subscriptionRoundInclTo || 1;
        monthlyIncl = Math.round(pre * (1 + rc.gstRate) / step) * step;
      }
      const monthlyTaxable = round2(monthlyIncl / (1 + rc.gstRate));
      const days = s.days.slice().sort().map(d => DAY_SHORT[d]).join(" & ");
      lines.push({
        label: `${months >= 3 ? `${months}-month plan` : "Monthly subscription"} — ${days}, ${fmtTime(s.start)} – ${fmtTime(s.end)}`,
        detail: `${perMonth} sessions/month (${rc.weeksPerMonth} weeks × ${s.days.length} days), ${round2(h)} hr each · ₹${Math.round(monthlyIncl / perMonth).toLocaleString("en-IN")} per session incl. GST`,
        qty: months, unit: "month", rate: monthlyTaxable, standardRate: round2(stdMonthly), amount: round2(monthlyIncl * months / (1 + rc.gstRate)),
      });
      schedulePlan = Array.from({ length: months }, (_, i) => ({
        label: i === 0 ? "Month 1 — advance" : `Month ${i + 1}`,
        kind: (i === 0 ? "advance" : "monthly") as Installment["kind"],
        amountIncl: monthlyIncl,
        dueDate: i === 0 ? "" : addDays(addMonths(s.startDate, i), -1),
      }));
      notes.push(`Month 1 is payable in advance before the first session${months > 1 ? `; months 2–${months} are payable the day before each month begins` : ""}.`);
      notes.push(`In months with a fifth ${days} session, each additional session is charged at the per-session rate.`);
    }
  }

  if (input.type === "night_subscription") {
    if (!input.nights?.startMonth) warnings.push("Pick a start month.");
    else {
      const months = nightsByMonth(input, rc);
      const rate = round2(rc.nightRateIncl / (1 + rc.gstRate));
      for (const m of months) {
        lines.push({ label: `Late-night plan — ${monthLabel(m.ym)}`, detail: `${m.nights.length} Fri–Sat nights · ${fmtTime(rc.nightStart)} – ${fmtTime(rc.nightEnd)} · ${inr(rc.nightRateIncl)} per night incl. GST`, qty: m.nights.length, unit: "night", rate, standardRate: rate, amount: round2(rc.nightRateIncl * m.nights.length / (1 + rc.gstRate)) });
      }
      deposit = rc.nightDeposit;
      lines.push({ label: "Security deposit (refundable)", detail: "Refunded within 15 days of the plan ending, less any damages or dues", qty: 1, unit: "", rate: deposit, amount: deposit, taxable: false });
      schedulePlan = months.map((m, i) => ({
        label: i === 0 ? `${monthLabel(m.ym)} — advance` : monthLabel(m.ym), kind: (i === 0 ? "advance" : "monthly") as Installment["kind"],
        amountIncl: m.nights.length * rc.nightRateIncl, dueDate: i === 0 ? "" : addDays(m.nights[0] || `${m.ym}-01`, -1),
      }));
      notes.push("The monthly fee is payable in advance, before the first event night of each month. Unused nights are not refunded or carried forward.");
    }
  }

  if (input.type === "custom") {
    for (const c of input.customLines || []) {
      if (!c.label) continue;
      lines.push({ label: c.label, detail: c.detail, qty: c.qty || 1, unit: c.unit || "", rate: c.rate || 0, standardRate: c.rate || 0, amount: round2((c.qty || 1) * (c.rate || 0)) });
    }
    if (!lines.length) warnings.push("Add at least one line item.");
  }

  // ── Add-ons (venue / custom) ──
  if (input.type === "venue" || input.type === "custom") {
    for (const pick of input.addOns || []) {
      const def = rc.addOns.find(a => a.id === pick.id); if (!def) continue;
      const qty = pick.qty ?? (def.unit === "per_person" ? Math.max(1, input.guests || 1) : def.unit === "per_hour" ? 1 : 1);
      const waived = (input.waiveAddOns || []).includes(def.id);
      lines.push({ label: def.label + (waived ? " — waived" : ""), detail: waived ? "Complimentary for this booking — one-time waiver" : def.detail, qty, unit: def.unit === "per_person" ? "person" : def.unit === "per_hour" ? "hr" : "", rate: waived ? 0 : def.price, standardRate: def.price, amount: waived ? 0 : round2(qty * def.price), waived });
    }
  }

  // ── Rep discounts ──
  const taxableBeforeDisc = lines.filter(l => l.taxable !== false).reduce((s, l) => s + l.amount, 0);
  if (input.discountPct && input.discountPct > 0) {
    lines.push({ label: `Special discount (${input.discountPct}%)`, detail: input.discountNote, qty: 1, unit: "", rate: 0, amount: -round2(taxableBeforeDisc * input.discountPct / 100) });
  }
  if (input.discountFlat && input.discountFlat > 0) {
    lines.push({ label: "Special discount", detail: input.discountNote, qty: 1, unit: "", rate: 0, amount: -round2(input.discountFlat) });
  }

  // ── Totals ──
  const taxable = round2(Math.max(0, lines.filter(l => l.taxable !== false).reduce((s, l) => s + l.amount, 0)));
  const standardValue = round2(lines.filter(l => l.taxable !== false && l.amount >= 0 || l.waived).reduce((s, l) => s + (l.standardRate != null ? l.qty * l.standardRate : Math.max(0, l.amount)), 0));
  const stateCode = (input.clientGstin || "").trim().slice(0, 2);
  const inter = !!stateCode && /^\d\d$/.test(stateCode) && stateCode !== rc.homeStateCode;
  const gst = round2(taxable * rc.gstRate);
  const igst = inter ? gst : 0;
  const cgst = inter ? 0 : round2(gst / 2);
  const sgst = inter ? 0 : round2(gst - cgst);
  const total = round2(taxable + gst);
  const standardTotal = round2(standardValue * (1 + rc.gstRate));
  const savings = round2(Math.max(0, standardTotal - total));
  const savingsPct = standardTotal > 0 ? Math.round((savings / standardTotal) * 100) : 0;

  const firstDate = input.event?.date || sessions[0]?.date || input.subscription?.startDate || "";
  const lastDate = sessions[sessions.length - 1]?.date || firstDate;

  // ── Payment schedule ──
  const schedule: Installment[] = [];
  if (input.type === "event" && total > 0) {
    // < ₹5,000 → flat ₹1,000 advance; otherwise 40%. Balance the day before the event.
    const adv = input.advancePct != null ? round2(total * input.advancePct / 100)
      : total < rc.smallTotal ? Math.min(rc.smallAdvance, total) : round2(total * rc.eventAdvancePct / 100);
    const evDate = input.event?.date || firstDate;
    schedule.push({ id: "i1", label: adv >= total ? "Full payment" : "Advance — blocks your date", kind: "advance", amount: round2(Math.min(adv, total)), dueDate: "" });
    if (adv < total) {
      const due = addDays(evDate, -rc.balanceDaysBefore);
      schedule.push({ id: "i2", label: "Balance", kind: "balance", amount: round2(total - adv), dueDate: due < today ? today : due });
    }
  } else if (input.type === "event") {
    // nothing to pay upfront (e.g. ticketing only, event ≤ 1 hr)
  } else if (schedulePlan) {
    let running = 0;
    schedulePlan.forEach((p, i) => {
      const isLast = i === schedulePlan!.length - 1;
      const amt = isLast ? round2(total - running) : round2(p.amountIncl || 0);
      running = round2(running + amt);
      schedule.push({ id: `i${i + 1}`, label: p.label, kind: p.kind, amount: amt, dueDate: p.dueDate });
    });
  } else {
    const pct = Math.min(100, Math.max(0, input.advancePct ?? rc.advancePct));
    const adv = round2(total * pct / 100);
    schedule.push({ id: "i1", label: pct >= 100 ? "Full payment" : `Advance — ${pct}%`, kind: "advance", amount: pct >= 100 ? total : adv, dueDate: "" });
    if (pct < 100) {
      const due = firstDate ? addDays(firstDate, -rc.balanceDaysBefore) : "";
      schedule.push({ id: "i2", label: `Balance — ${round2(100 - pct)}%`, kind: "balance", amount: round2(total - adv), dueDate: due < today ? today : due });
    }
  }
  if (deposit > 0) schedule.unshift({ id: "dep", label: "Security deposit (refundable)", kind: "deposit", amount: deposit, dueDate: "" });

  const advance = round2(schedule.filter(s => s.dueDate === "").reduce((s, x) => s + x.amount, 0));
  const balanceInst = schedule.filter(s => s.dueDate !== "");
  const balance = round2(balanceInst.reduce((s, x) => s + x.amount, 0));

  if (firstDate && firstDate < today) warnings.push("The first date is in the past.");
  if (input.type === "event") {
    notes.push(total > 0 ? `Your date is blocked once the advance is paid. The balance is due ${rc.balanceDaysBefore === 1 ? "the day" : `${rc.balanceDaysBefore} days`} before the event.` : "No upfront payment is needed.");
    notes.push(`Date or slot changes are possible to any open slot for ₹${rc.rescheduleFee} + GST.`);
  }
  if (input.type === "venue") {
    notes.push(`The date is blocked only once the advance is received. The balance is due ${rc.balanceDaysBefore === 1 ? "a day" : `${rc.balanceDaysBefore} days`} before the ${sessions.length > 1 ? "first session" : "event"}.`);
    notes.push(`Any time beyond the booked hours is charged at ${inr(rc.overtimeHourly)} per hour + GST, subject to availability.`);
  }
  notes.push(`All amounts are inclusive of GST @${Math.round(rc.gstRate * 100)}% (${inter ? "IGST — inter-state supply" : "CGST + SGST"}). A tax invoice is raised on confirmation.`);

  return {
    lines, standardValue, discount: round2(Math.max(0, standardValue - taxable)), taxable, gstRate: rc.gstRate,
    cgst, sgst, igst, gst, total, deposit, grandTotal: round2(total + deposit), standardTotal, savings, savingsPct,
    advance, balance, balanceDueDate: balanceInst[balanceInst.length - 1]?.dueDate || "",
    schedule, firstDate, lastDate, hours: round2(totalHours), sessionsCount: sessions.length, notes, warnings,
  };
}

// ── Money position ───────────────────────────────────────────────────────────

export function moneyStatus(b: Pick<Booking, "quote" | "payments">, today = todayIST()): MoneyStatus {
  const pays: Payment[] = Object.values(b.payments || {}).sort((a, c) => (a.paidOn || "").localeCompare(c.paidOn || "") || a.createdAt - c.createdAt);
  const verified = pays.filter(p => p.verified);
  const verifiedPaid = round2(verified.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const claimedPaid = round2(pays.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const pendingVerification = round2(claimedPaid - verifiedPaid);
  // A client's UPI reference counts as paid straight away (team collects the screenshot later).
  let pool = claimedPaid;
  const installments = b.quote.schedule.map(inst => {
    const paid = round2(Math.min(inst.amount, Math.max(0, pool))); pool = round2(pool - paid);
    const due = round2(inst.amount - paid);
    const state: "paid" | "partial" | "unpaid" | "overdue" =
      due <= 0.5 ? "paid" : inst.dueDate && inst.dueDate < today ? "overdue" : paid > 0 ? "partial" : "unpaid";
    return { ...inst, paid, due, state };
  });
  const outstanding = round2(b.quote.grandTotal - claimedPaid);
  const status: MoneyStatus["status"] =
    outstanding < -0.5 ? "overpaid" : outstanding <= 0.5 ? "paid" :
    claimedPaid > 0 ? "partial" : "unpaid";
  const next = installments.find(i => i.state !== "paid");
  return {
    verifiedPaid, claimedPaid, outstanding, pendingVerification,
    firstPaidOn: pays[0]?.paidOn, lastUtr: pays[pays.length - 1]?.utr, status, installments,
    nextDue: next ? { ...next, due: next.due } : undefined,
  };
}

// ── Availability / conflicts ─────────────────────────────────────────────────

function absRange(s: { date: string; start: string; end: string }) {
  const day = parseYMD(s.date).getTime() / 60000;
  const a = day + toMin(s.start);
  return [a, a + sessionHours(s.start, s.end) * 60] as const;
}
export function overlaps(a: Session, b: Session): boolean {
  const [a1, a2] = absRange(a), [b1, b2] = absRange(b);
  return a1 < b2 && b1 < a2;
}

/** Which existing bookings block the calendar. Advance verified → booked; payment claimed → held. */
export function blockState(b: Booking): BusyBlock["state"] | null {
  if (b.stage === "cancelled" || b.stage === "lost") return null;
  if (b.stage === "confirmed" || b.stage === "completed") return "booked";
  const pays = Object.values(b.payments || {});
  if (pays.length) return "held";
  return null;
}

export function busyBlocks(bookings: Booking[], rc: RateCard, from: string, to: string): BusyBlock[] {
  const out: BusyBlock[] = [];
  for (const b of bookings) {
    const st = blockState(b); if (!st) continue;
    for (const s of expandSessions(b.input, rc)) {
      // a session past midnight also occupies the next morning
      if (s.date >= addDays(from, -1) && s.date <= to) out.push({ date: s.date, start: s.start, end: s.end, state: st });
    }
  }
  return out;
}

export function findConflicts(input: QuoteInput, existing: Booking[], rc: RateCard, ignoreId?: string) {
  const mine = expandSessions(input, rc);
  const hits: { booking: Booking; session: Session; state: BusyBlock["state"] }[] = [];
  for (const b of existing) {
    if (b.id === ignoreId) continue;
    const st = blockState(b); if (!st) continue;
    const theirs = expandSessions(b.input, rc);
    for (const s of mine) {
      const t = theirs.find(x => Math.abs(parseYMD(x.date).getTime() - parseYMD(s.date).getTime()) <= 86400000 && overlaps(s, x));
      if (t) { hits.push({ booking: b, session: s, state: st }); break; }
    }
  }
  return hits;
}

export function describeWhen(input: QuoteInput, rc: RateCard): string {
  if (input.type === "event" && input.event?.date) {
    const e = input.event;
    return `${fmtDate(e.date)} · ${fmtTime(e.start)}–${fmtTime(fromMin(toMin(e.start) + eventMinutes(e)))}`;
  }
  const s = expandSessions(input, rc);
  if (input.type === "subscription" && input.subscription) {
    const x = input.subscription;
    return `${x.days.slice().sort().map(d => DAY_SHORT[d]).join(" & ")} ${fmtTime(x.start)}–${fmtTime(x.end)} from ${fmtDate(x.startDate, false)} (${x.months} mo)`;
  }
  if (input.type === "night_subscription" && input.nights) return `Fri & Sat nights from ${monthLabel(input.nights.startMonth)} (${input.nights.months} mo)`;
  if (!s.length) return "";
  if (s.length === 1) return `${fmtDate(s[0].date)} · ${fmtTime(s[0].start)}–${fmtTime(s[0].end)}`;
  return `${s.length} sessions · ${fmtDate(s[0].date, false)} → ${fmtDate(s[s.length - 1].date, false)}`;
}

export const TYPE_LABEL: Record<string, string> = {
  event: "Event booking", venue: "One-time booking", subscription: "Subscription (classes)", night_subscription: "Late-night subscription", custom: "Custom package",
};
export const STAGE_LABEL: Record<string, string> = {
  enquiry: "New enquiry", quoted: "Quoted", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", lost: "Lost",
};
export const PAY_LABEL: Record<string, string> = {
  unpaid: "Unpaid", awaiting_verification: "Screenshot pending", partial: "Part-paid", paid: "Paid in full", overpaid: "Overpaid",
};

/** UPI intent for an amount — scanned by any UPI app. */
export function upiLink(rc: RateCard, amount: number, note: string): string {
  const p = new URLSearchParams({ pa: rc.upiVpa, pn: rc.upiName, am: amount.toFixed(2), cu: "INR", tn: note.slice(0, 50) });
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

export { ymd };
