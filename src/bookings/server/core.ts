// Booking operations shared by /api/bookings and /api/cron.
import { randomBytes } from "node:crypto";
import { adb, APP_URL, clean, loadRateCard } from "./admin.js";
import { sendEmail, alertStaff, upsertNotion, STAFF_EMAILS, telegram } from "./notify.js";
import { sendWa, waTeam, waNumber } from "./whatsapp.js";
import * as T from "./templates.js";
import type { Booking, Payment, PublicBooking, QuoteInput, Source, Stage, MoneyStatus } from "../shared/types.js";
import type { RateCard } from "../shared/rateCard.js";
import { computeQuote, moneyStatus, findConflicts, expandSessions, describeWhen, PAY_LABEL, STAGE_LABEL } from "../shared/pricing.js";
import { buildIcs, bookingIcsEvents, sessionEnd } from "../shared/ics.js";
import { MONTH_CODE, todayIST, addDays, daysBetween, fmtDate } from "../shared/dates.js";

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const rand = (n: number, alpha = ALPHA) => Array.from(randomBytes(n), x => alpha[x % alpha.length]).join("");
export const newId = () => rand(20, "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789");
const newRef = () => `LR-${rand(5)}`;

const bRef = (id: string) => adb().ref(`crm/bookings/${id}`);
export const clientLink = (b: Booking) => `${APP_URL}/b/${b.id}`;
export const crmLink = (b?: Booking) => `${APP_URL}/crm${b ? `?b=${b.id}` : ""}`;

export async function getBooking(id: string): Promise<Booking> {
  if (!/^[A-Za-z0-9]{12,40}$/.test(id || "")) throw new HttpError(404, "Booking not found");
  const s = await bRef(id).get();
  if (!s.exists()) throw new HttpError(404, "Booking not found");
  return { ...s.val(), id } as Booking;
}

export async function allBookings(): Promise<Booking[]> {
  const s = await adb().ref("crm/bookings").get();
  return Object.entries<any>(s.val() || {}).map(([id, v]) => ({ ...v, id }));
}

/** LR/2026/NOV/101 — online numbers start at 101 so they never clash with hand-made quotes. */
async function nextQuoteNo(now = Date.now()): Promise<string> {
  const today = todayIST(now); const [y, m] = today.split("-");
  const r = await adb().ref(`crm/counters/${y}-${m}`).transaction(v => (Number(v) || 100) + 1);
  return `LR/${y}/${MONTH_CODE[Number(m) - 1]}/${String(r.snapshot.val()).padStart(3, "0")}`;
}

// ── Input hygiene ────────────────────────────────────────────────────────────

const str = (v: any, max = 200) => String(v ?? "").trim().slice(0, max);
const num = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? undefined : Number(v));
const isDate = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const isTime = (s: any) => /^\d{2}:\d{2}$/.test(s || "");

export function sanitizeInput(raw: any, staff: boolean, rc: RateCard): QuoteInput {
  const type = ["event", "venue", "subscription", "night_subscription", "custom"].includes(raw?.type) ? raw.type : "event";
  if (type === "custom" && !staff) throw new HttpError(400, "Invalid booking type");
  const input: QuoteInput = { type, guests: Math.max(0, Math.min(500, num(raw?.guests) || 0)) || undefined, clientGstin: str(raw?.clientGstin, 15).toUpperCase() || undefined };
  if (type === "event") {
    const e = raw?.event || {};
    const mins = (v: any) => Math.max(0, Math.min(240, Math.round((num(v) || 0) / 15) * 15));
    input.event = {
      date: isDate(e.date) ? e.date : "", start: isTime(e.start) ? e.start : "", end: isTime(e.end) ? e.end : "",
      guestsTier: ([0, 1, 2].includes(num(e.guestsTier) as number) ? num(e.guestsTier) : 0) as 0 | 1 | 2,
      need: ["space", "both", "tix"].includes(e.need) ? e.need : "space",
      preMin: mins(e.preMin), postMin: mins(e.postMin), firstTime: !!e.firstTime, oneTime: e.oneTime !== false,
      ticketPrice: num(e.ticketPrice), ticketsExpected: num(e.ticketsExpected),
    };
    input.guests = [20, 40, 60][input.event.guestsTier];
  }
  if (type === "venue") input.sessions = (Array.isArray(raw?.sessions) ? raw.sessions : []).slice(0, 60)
    .filter((s: any) => isDate(s?.date) && isTime(s?.start) && isTime(s?.end)).map((s: any) => ({ date: s.date, start: s.start, end: s.end }));
  if (type === "subscription") {
    const s = raw?.subscription || {};
    input.subscription = { days: (Array.isArray(s.days) ? s.days : []).map(Number).filter((d: number) => d >= 0 && d <= 6), start: isTime(s.start) ? s.start : "09:00", end: isTime(s.end) ? s.end : "10:00", startDate: isDate(s.startDate) ? s.startDate : "", months: Math.max(1, Math.min(12, num(s.months) || 1)) };
  }
  if (type === "night_subscription") input.nights = { startMonth: /^\d{4}-\d{2}$/.test(raw?.nights?.startMonth) ? raw.nights.startMonth : "", months: Math.max(1, Math.min(12, num(raw?.nights?.months) || 1)) };
  const publicAddOns = new Set(rc.addOns.filter(a => staff || a.publicVisible).map(a => a.id));
  input.addOns = (Array.isArray(raw?.addOns) ? raw.addOns : []).filter((a: any) => publicAddOns.has(a?.id)).map((a: any) => clean({ id: a.id, qty: num(a.qty) }));
  if (staff) {
    if (type === "custom") input.customLines = (raw?.customLines || []).slice(0, 30).map((c: any) => ({ label: str(c.label), detail: str(c.detail, 300) || undefined, qty: num(c.qty) || 1, unit: str(c.unit, 20), rate: num(c.rate) || 0 }));
    input.rateOverride = num(raw?.rateOverride);
    input.discountPct = num(raw?.discountPct); input.discountFlat = num(raw?.discountFlat);
    input.discountNote = str(raw?.discountNote, 200) || undefined;
    input.advancePct = num(raw?.advancePct);
    input.waiveAddOns = Array.isArray(raw?.waiveAddOns) ? raw.waiveAddOns.map(String) : undefined;
  }
  return clean(input);
}

function money(b: Booking) { return moneyStatus(b); }

export function publicView(b: Booking): PublicBooking {
  return {
    id: b.id, ref: b.ref, quoteNo: b.quoteNo, createdAt: b.createdAt, stage: b.stage,
    name: b.name, phone: b.phone, email: b.email, organisation: b.organisation, gstin: b.gstin,
    title: b.title, purpose: b.purpose, requests: b.requests, input: b.input, quote: b.quote, money: money(b),
    payments: Object.values(b.payments || {}).map(p => ({ amount: p.amount, utr: p.utr, paidOn: p.paidOn, verified: p.verified })),
  };
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createBooking(body: any, staff: { email: string } | null) {
  if (body?.website) throw new HttpError(400, "Spam"); // honeypot
  if (!process.env.FIREBASE_SERVICE_ACCOUNT && process.env.LR_DEV_MOCK !== "1")
    throw new HttpError(503, "Online booking is being set up — please WhatsApp us to book this slot. (Admin: add FIREBASE_SERVICE_ACCOUNT, see BOOKINGS_SETUP.md step 2.)");
  const rc = await loadRateCard();
  const name = str(body?.name, 80), phone = str(body?.phone, 20).replace(/[^\d+]/g, ""), email = str(body?.email, 120).toLowerCase();
  if (!name) throw new HttpError(400, "Please enter your name");
  if (phone.replace(/\D/g, "").length < 10) throw new HttpError(400, "Please enter a valid mobile number");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Please enter a valid email");

  const input = sanitizeInput(body?.input, !!staff, rc);
  const quote = computeQuote(input, rc);
  const blocking = quote.warnings.filter(w => !/past/.test(w) || !staff);
  if (blocking.length) throw new HttpError(400, blocking[0]);

  const existing = await allBookings();
  const conflicts = findConflicts(input, existing, rc);
  if (conflicts.length && !staff) {
    const c = conflicts[0];
    throw new HttpError(409, `Sorry — ${fmtDate(c.session.date)} ${c.session.start}–${c.session.end} is already ${c.state === "booked" ? "booked" : "on hold"}. Please pick another slot.`);
  }

  const now = Date.now();
  const sources: Source[] = ["social", "website", "rep", "walk_in", "referral", "whatsapp", "other"];
  const b: Booking = clean({
    id: newId(), ref: newRef(), quoteNo: await nextQuoteNo(now), createdAt: now, updatedAt: now,
    stage: (staff ? "quoted" : "enquiry") as Stage,
    source: sources.includes(body?.source) ? body.source : staff ? "rep" : "website",
    sourceDetail: str(body?.sourceDetail, 100) || undefined,
    createdBy: staff?.email, assignedTo: staff?.email,
    name, phone, email, organisation: str(body?.organisation, 120) || undefined, gstin: input.clientGstin,
    clientType: ["individual", "business", "event_partner"].includes(body?.clientType) ? body.clientType : "individual",
    partnerBank: body?.partnerBank ? {
      accountName: str(body.partnerBank.accountName, 80) || undefined, accountNo: str(body.partnerBank.accountNo, 30) || undefined,
      ifsc: str(body.partnerBank.ifsc, 15).toUpperCase() || undefined, bankName: str(body.partnerBank.bankName, 60) || undefined,
      upi: str(body.partnerBank.upi, 60) || undefined, pan: str(body.partnerBank.pan, 12).toUpperCase() || undefined,
    } : undefined,
    heardFrom: str(body?.heardFrom, 60) || undefined, marketingConsent: !!body?.marketingConsent,
    title: str(body?.title, 100) || str(body?.purpose, 60) || "Booking", purpose: str(body?.purpose, 60) || "Other",
    requests: str(body?.requests, 1000) || undefined, input, quote, isFirstTime: !existing.some(x => x.phone === phone),
    followUpOn: addDays(todayIST(now), 1),
  });
  if (b.partnerBank && !Object.keys(b.partnerBank).length) delete b.partnerBank;
  await bRef(b.id).set(b);

  const link = clientLink(b);
  const c = T.clientEnquiry(b, rc, link);
  const s = T.staffNewEnquiry(b, rc, crmLink(b));
  const tasks: Promise<any>[] = [alertStaff(s.subject, s.html, s.tg + (conflicts.length ? `\n⚠️ Overlaps ${conflicts[0].booking.ref}` : ""))];
  if (b.email && body?.sendEmail !== false) tasks.push(sendEmail(b.email, c.subject, c.html).then(ok => logEmail(b, "quote", ok)));
  if (body?.sendEmail !== false) tasks.push(sendWa(b.phone, "lr_quote", [first(b.name), b.title, describeWhen(b.input, rc), money2(b.quote.grandTotal), money2(b.quote.advance), link]).then(ok => logEmail(b, "wa_quote", ok, b.phone)));
  await Promise.all(tasks);
  return { booking: publicView(b), link, conflicts: conflicts.map(x => ({ ref: x.booking.ref, date: x.session.date, state: x.state })) };
}

async function logEmail(b: Booking, kind: string, ok: boolean, to?: string) {
  if (!ok && kind.startsWith("wa_") && !process.env.WHATSAPP_TOKEN) return; // WhatsApp not set up yet — don't clutter the log
  await bRef(b.id).child("emailLog").push({ at: Date.now(), kind, to: to || b.email || "", ok });
}

const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "there";
const money2 = (v: number) => Math.round(v).toLocaleString("en-IN");

async function sendReminderWa(b: Booking, rc: RateCard, inst: { due: number; dueDate: string; id: string }, kind: "today" | "overdue") {
  const ok = kind === "today"
    ? await sendWa(b.phone, "lr_balance_due", [first(b.name), money2(inst.due), b.title, describeWhen(b.input, rc), clientLink(b)])
    : await sendWa(b.phone, "lr_payment_overdue", [first(b.name), money2(inst.due), b.ref, fmtDate(inst.dueDate), clientLink(b)]);
  await logEmail(b, `wa_reminder_${kind}`, ok, b.phone);
  return ok;
}

// ── Payments ─────────────────────────────────────────────────────────────────

/** Client taps "I've paid" and enters the UPI reference. */
export async function claimPayment(id: string, body: any) {
  const b = await getBooking(id);
  if (b.stage === "cancelled" || b.stage === "lost") throw new HttpError(400, "This booking is closed. Please contact us.");
  const utr = str(body?.utr, 40).replace(/\s+/g, "");
  const amount = num(body?.amount) || 0;
  if (utr.length < 6) throw new HttpError(400, "Please enter the UPI reference / UTR number (12 digits in your UPI app)");
  if (amount <= 0 || amount > b.quote.grandTotal * 1.5) throw new HttpError(400, "Please enter the amount you paid");
  if (Object.values(b.payments || {}).some(p => p.utr === utr)) throw new HttpError(409, "We already have this UPI reference — thank you!");

  const rc = await loadRateCard();
  // If someone else got confirmed for the same slot meanwhile, still record — but flag it to the team.
  const others = (await allBookings()).filter(x => x.id !== b.id);
  const conflict = findConflicts(b.input, others, rc).find(c => c.state === "booked");

  const p: Payment = clean({
    id: "", amount, utr, method: "upi", paidOn: isDate(body?.paidOn) ? body.paidOn : todayIST(),
    source: "client", verified: false, createdAt: Date.now(), note: str(body?.note, 200) || undefined,
  });
  const pr = bRef(id).child("payments").push(); p.id = pr.key!;
  await pr.set(p);
  await bRef(id).update({ updatedAt: Date.now(), ...(b.stage === "enquiry" ? { stage: "quoted" } : {}) });
  const fresh = await getBooking(id);

  const cm = T.clientPaymentNoted(fresh, rc, p, clientLink(fresh));
  const sm = T.staffPaymentClaim(fresh, rc, p, crmLink(fresh), conflict ? `Slot overlaps confirmed booking ${conflict.booking.ref} (${conflict.booking.name})` : undefined);
  await Promise.all([
    fresh.email ? sendEmail(fresh.email, cm.subject, cm.html).then(ok => logEmail(fresh, "payment_noted", ok)) : null,
    sendWa(fresh.phone, "lr_payment_received", [first(fresh.name), money2(p.amount), fresh.ref]).then(ok => logEmail(fresh, "wa_payment_noted", ok, fresh.phone)),
    alertStaff(sm.subject, sm.html, sm.tg),
  ]);
  await syncCalendar(fresh, rc);
  return publicView(fresh);
}

/** Staff records a payment (cash / bank transfer / UPI seen in the bank app). */
export async function addPayment(id: string, body: any, staff: { email: string }) {
  const b = await getBooking(id);
  const amount = num(body?.amount) || 0;
  if (!amount) throw new HttpError(400, "Amount required");
  const p: Payment = clean({
    id: "", amount, utr: str(body?.utr, 40) || "—", method: ["upi", "bank_transfer", "cash", "card", "other"].includes(body?.method) ? body.method : "upi",
    paidOn: isDate(body?.paidOn) ? body.paidOn : todayIST(), source: body?.source === "bank_statement" ? "bank_statement" : "rep",
    verified: body?.verified !== false, verifiedBy: body?.verified !== false ? staff.email : undefined, verifiedAt: body?.verified !== false ? Date.now() : undefined,
    note: str(body?.note, 200) || undefined, createdAt: Date.now(),
  });
  const pr = bRef(id).child("payments").push(); p.id = pr.key!;
  await pr.set(p);
  return afterMoneyChange(b, p, body?.notify !== false);
}

export async function verifyPayment(id: string, paymentId: string, verified: boolean, staff: { email: string }, notify = true) {
  const b = await getBooking(id);
  const p = b.payments?.[paymentId]; if (!p) throw new HttpError(404, "Payment not found");
  await bRef(id).child(`payments/${paymentId}`).update(verified
    ? { verified: true, verifiedBy: staff.email, verifiedAt: Date.now() }
    : { verified: false, verifiedBy: null, verifiedAt: null });
  return afterMoneyChange(b, { ...p, verified }, notify && verified);
}

export async function deletePayment(id: string, paymentId: string) {
  const b = await getBooking(id);
  await bRef(id).child(`payments/${paymentId}`).remove();
  return afterMoneyChange(b, undefined, false);
}

/** Auto-confirm once the advance is verified; email the client; refresh calendars. */
async function afterMoneyChange(before: Booking, p: Payment | undefined, notify: boolean) {
  const rc = await loadRateCard();
  const b = await getBooking(before.id);
  const m = money(b);
  const advanceDue = b.quote.schedule.filter(s => s.dueDate === "").reduce((s, x) => s + x.amount, 0);
  const patch: any = { updatedAt: Date.now() };
  let firstConfirm = false;
  if (["enquiry", "quoted"].includes(b.stage) && m.verifiedPaid >= advanceDue - 0.5 && m.verifiedPaid > 0) {
    patch.stage = "confirmed"; patch.confirmedAt = Date.now(); firstConfirm = true;
  }
  if (b.stage === "completed" && m.outstanding <= 0.5 && !b.reconciledAt) patch.reconciledAt = Date.now();
  await bRef(b.id).update(patch);
  const fresh = { ...b, ...patch } as Booking;
  if (notify && p?.verified) {
    const mm = money(fresh);
    const ok = await sendWa(fresh.phone, "lr_booking_confirmed", [first(fresh.name), fresh.ref, describeWhen(fresh.input, rc), money2(mm.verifiedPaid), money2(Math.max(0, mm.outstanding)), mm.nextDue?.dueDate ? fmtDate(mm.nextDue.dueDate) : "-", clientLink(fresh)]);
    await logEmail(fresh, firstConfirm ? "wa_confirmed" : "wa_receipt", ok, fresh.phone);
  }
  if (notify && p?.verified && fresh.email) {
    const e = T.clientConfirmed(fresh, rc, money(fresh), clientLink(fresh), firstConfirm, p);
    const att = firstConfirm ? [{ filename: "living-roots-booking.ics", contentType: "text/calendar", content: buildIcs(bookingIcsEvents(fresh, rc, { forClient: true, appUrl: APP_URL }), "Living Roots") }] : [];
    const ok = await sendEmail(fresh.email, e.subject, e.html, att);
    await logEmail(fresh, firstConfirm ? "confirmed" : "receipt", ok);
  }
  await syncCalendar(fresh, rc);
  return { booking: publicView(fresh), money: money(fresh), confirmed: firstConfirm };
}

// ── Staff edits ──────────────────────────────────────────────────────────────

const EDITABLE = ["name", "phone", "email", "organisation", "gstin", "clientType", "partnerBank", "title", "purpose", "requests", "source", "sourceDetail", "assignedTo", "followUpOn", "heardFrom"];

export async function updateBooking(id: string, body: any, staff: { email: string }) {
  const b = await getBooking(id);
  const rc = await loadRateCard();
  const patch: any = { updatedAt: Date.now() };
  for (const k of EDITABLE) if (body?.patch && k in body.patch) patch[k] = body.patch[k] === "" ? null : body.patch[k];
  if (body?.input) {
    const input = sanitizeInput(body.input, true, rc);
    patch.input = input; patch.quote = computeQuote(input, rc, { today: todayIST(b.createdAt) });
    patch.reminders = null; // dates may have moved
    if (body.newQuoteNo) patch.quoteNo = await nextQuoteNo();
  }
  if (body?.stage && ["enquiry", "quoted", "confirmed", "completed", "cancelled", "lost"].includes(body.stage)) {
    patch.stage = body.stage;
    if (body.stage === "confirmed" && !b.confirmedAt) patch.confirmedAt = Date.now();
    if (body.stage === "completed") patch.completedAt = Date.now();
    if (["cancelled", "lost"].includes(body.stage)) patch.cancelReason = str(body.reason, 300) || null;
  }
  if (body?.note) {
    const n = bRef(id).child("notes").push();
    await n.set({ at: Date.now(), by: staff.email, text: str(body.note, 2000) });
  }
  await bRef(id).update(clean(patch) as any); // null values delete the field
  const fresh = await getBooking(id);
  await syncCalendar(fresh, rc);
  if (body?.resendQuote && fresh.email) {
    const e = T.clientEnquiry(fresh, rc, clientLink(fresh));
    await logEmail(fresh, "quote", await sendEmail(fresh.email, e.subject, e.html));
  }
  return { booking: publicView(fresh) };
}

export async function sendReminderNow(id: string) {
  const b = await getBooking(id); const rc = await loadRateCard();
  const m = money(b); const next = m.nextDue;
  if (!next) throw new HttpError(400, "Nothing is due on this booking");
  const overdue = !!next.dueDate && next.dueDate < todayIST();
  const wa = await sendReminderWa(b, rc, next, overdue ? "overdue" : "today");
  let mail = false;
  if (b.email) {
    const e = T.clientReminder(b, rc, next, overdue ? "overdue" : "today", clientLink(b));
    mail = await sendEmail(b.email, e.subject, e.html);
    await logEmail(b, "reminder", mail);
  }
  if (!wa && !mail) throw new HttpError(500, "Reminder could not be sent — check the WhatsApp / email settings, or use the WhatsApp button");
  return { ok: true, whatsapp: wa, email: mail };
}

// ── Calendars ────────────────────────────────────────────────────────────────

export function calendarState(b: Booking): "booked" | "held" | null {
  if (["cancelled", "lost"].includes(b.stage)) return null;
  if (["confirmed", "completed"].includes(b.stage)) return "booked";
  return Object.keys(b.payments || {}).length ? "held" : null;
}

async function syncCalendar(b: Booking, rc: RateCard) {
  const state = calendarState(b);
  if (!state && !b.notionPageId) return;
  const s = expandSessions(b.input, rc); if (!s.length) return;
  const last = s[s.length - 1]; const end = sessionEnd(last);
  const m = money(b);
  const pageId = await upsertNotion(b.notionPageId, {
    title: `${b.title} — ${b.name}`, start: `${s[0].date}T${s[0].start}:00`, end: s.length === 1 ? `${end.date}T${end.time}:00` : `${end.date}T${end.time}:00`,
    status: state === "booked" ? "Booked" : state === "held" ? "On hold (verify payment)" : STAGE_LABEL[b.stage],
    payment: PAY_LABEL[m.status], client: `${b.name}${b.organisation ? ` · ${b.organisation}` : ""}`, phone: b.phone,
    total: b.quote.grandTotal, outstanding: Math.max(0, m.outstanding), ref: `${b.ref} · ${b.quoteNo}`, link: crmLink(b), archived: !state,
  });
  if (pageId && pageId !== b.notionPageId) await bRef(b.id).update({ notionPageId: pageId });
  if (!state && b.notionPageId) await bRef(b.id).update({ notionPageId: null });
}

export async function icsFeed(): Promise<string> {
  const rc = await loadRateCard();
  const from = addDays(todayIST(), -60), to = addDays(todayIST(), 400);
  const events = (await allBookings()).flatMap(b => {
    const st = calendarState(b); if (!st) return [];
    return bookingIcsEvents(b, rc, { appUrl: APP_URL, state: st }).filter(e => e.date >= from && e.date <= to);
  });
  return buildIcs(events, "Living Roots bookings");
}

// ── Daily job: reminders, reconciliation, digest ─────────────────────────────

export async function runDaily(opts: { today?: string; dryRun?: boolean } = {}) {
  const today = opts.today || todayIST();
  const rc = await loadRateCard();
  const list = await allBookings();
  const sent: string[] = [];
  const sec = { verify: [] as T.DigestItem[], dueToday: [] as T.DigestItem[], overdue: [] as T.DigestItem[], recon: [] as T.DigestItem[], events: [] as T.DigestItem[], follow: [] as T.DigestItem[] };

  for (const b of list) {
    if (["cancelled", "lost"].includes(b.stage)) continue;
    const m: MoneyStatus = money(b);
    const ref = bRef(b.id);
    if (m.pendingVerification > 0) sec.verify.push({ b, m, note: `${m.pendingVerification.toLocaleString("en-IN")} claimed, UTR ${m.lastUtr}` });

    // 1) Balance / monthly reminders — sent on the due date (= the day before the event by default)
    if (b.stage === "confirmed") {
      for (const inst of m.installments) {
        if (inst.state === "paid" || !inst.dueDate) continue;
        const key = (k: string) => `${inst.id}:${k}`;
        let kind: "today" | "overdue" | null = null;
        if (inst.dueDate === today && !b.reminders?.[key("today")]) kind = "today";
        else if (inst.dueDate < today && daysBetween(inst.dueDate, today) <= 7 && daysBetween(inst.dueDate, today) % 2 === 1 && !b.reminders?.[key(`overdue-${today}`)]) kind = "overdue";
        if (inst.dueDate === today) sec.dueToday.push({ b, m, note: `${inst.label}: ${inst.due.toLocaleString("en-IN")}` });
        if (inst.dueDate < today) sec.overdue.push({ b, m, note: `${inst.label} due ${fmtDate(inst.dueDate, false)}` });
        if (kind && !opts.dryRun) {
          await sendReminderWa(b, rc, inst, kind);
          if (b.email) {
            const e = T.clientReminder(b, rc, inst, kind, clientLink(b));
            await logEmail(b, `reminder_${kind}`, await sendEmail(b.email, e.subject, e.html));
          }
          await ref.child("reminders").update({ [kind === "today" ? key("today") : key(`overdue-${today}`)]: Date.now() });
          sent.push(`${b.ref} ${kind}`);
        }
      }
    }

    // 2) Today's / tomorrow's events (heads-up for the team)
    const sessions = expandSessions(b.input, rc);
    const todays = sessions.filter(s => s.date === today || s.date === addDays(today, 1));
    if (calendarState(b) && todays.length) sec.events.push({ b, m, note: `${todays[0].date === today ? "Today" : "Tomorrow"} ${todays[0].start}–${todays[0].end}` });

    // 3) Reconciliation after the last session
    const last = b.quote.lastDate || sessions[sessions.length - 1]?.date;
    if (b.stage === "confirmed" && last && last < today) {
      if (m.outstanding <= 0.5 && m.pendingVerification <= 0) {
        if (!opts.dryRun) await ref.update({ stage: "completed", completedAt: Date.now(), reconciledAt: Date.now() });
        sec.recon.push({ b, m, note: "✅ Fully paid — marked completed" });
      } else sec.recon.push({ b, m, note: `❌ Event over ${fmtDate(last, false)} — ${Math.round(m.outstanding).toLocaleString("en-IN")} still outstanding` });
    }

    // 4) Enquiries going cold
    if (["enquiry", "quoted"].includes(b.stage) && (!b.followUpOn || b.followUpOn <= today))
      sec.follow.push({ b, m, note: `${daysBetween(todayIST(b.createdAt), today)}d old${b.assignedTo ? ` · ${b.assignedTo.split("@")[0]}` : " · unassigned"}` });
  }

  const d = T.staffDigest(rc, [
    { title: "Payments to verify", items: sec.verify },
    { title: "Reconciliation — events that are over", items: sec.recon },
    { title: "Balance due today (client reminded)", items: sec.dueToday },
    { title: "Overdue payments", items: sec.overdue },
    { title: "Events today & tomorrow", items: sec.events },
    { title: "Enquiries to follow up", items: sec.follow },
  ], crmLink());
  if (!opts.dryRun) await alertStaff(d.subject, d.html, d.tg);
  return { today, remindersSent: sent, counts: Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v.length])) };
}

// ── Evening job (9 PM): client payments still not matched to the bank ───────
// A client's "I've paid" holds the slot immediately. If by end of day the money
// hasn't been verified (bank statement / Yes Bank app), the team is told to chase it.

export async function runEvening(opts: { dryRun?: boolean } = {}) {
  const rc = await loadRateCard();
  const pending: { b: Booking; p: Payment }[] = [];
  for (const b of await allBookings()) {
    if (["cancelled", "lost"].includes(b.stage)) continue;
    for (const p of Object.values(b.payments || {})) if (!p.verified && p.source === "client") pending.push({ b, p });
  }
  if (!pending.length) return { pending: 0 };
  pending.sort((x, y) => x.p.createdAt - y.p.createdAt);
  const rows = pending.map(({ b, p }) => {
    const age = daysBetween(p.paidOn, todayIST());
    const ask = `Hi ${first(b.name)}, we haven't been able to find your payment of ₹${money2(p.amount)} (UPI ref ${p.utr}) for booking ${b.ref} in our bank yet. Could you please check and share the payment screenshot, or pay again here: ${clientLink(b)}`;
    const wa = `https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(ask)}`;
    return { b, p, age, wa };
  });
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2C1810">
<p><b>${pending.length} client payment${pending.length > 1 ? "s are" : " is"} still not matched to the bank.</b> The slot is on hold for each. Check the Yes Bank app / today's statement; if the money hasn't arrived, ask the client to pay again (one tap below).</p>
<table cellpadding="6" style="border-collapse:collapse;font-size:13px">${rows.map(r => `<tr style="border-bottom:1px solid #E8DCC8">
<td><b>${r.b.ref}</b><br>${esc(r.b.name)}<br>${esc(r.b.phone)}</td><td>₹${money2(r.p.amount)}<br>UTR ${esc(r.p.utr)}<br>claimed ${fmtDate(r.p.paidOn, false)}${r.age >= 1 ? ` · <b style="color:#A32D2D">${r.age} day${r.age > 1 ? "s" : ""} pending</b>` : ""}</td>
<td>${esc(r.b.title)}<br>${esc(describeWhen(r.b.input, rc))}</td>
<td><a href="${crmLink(r.b)}">Verify in CRM</a><br><a href="${r.wa}">Ask client on WhatsApp</a></td></tr>`).join("")}</table></div>`;
  const tg = `⏳ <b>${pending.length} payment${pending.length > 1 ? "s" : ""} still pending at day end</b>\n` + rows.map(r =>
    `• ${r.b.ref} ${esc(r.b.name)} — ₹${money2(r.p.amount)} UTR <code>${esc(r.p.utr)}</code>${r.age >= 1 ? ` (${r.age}d)` : ""}\n  <a href="${crmLink(r.b)}">verify</a> · <a href="${r.wa}">ask client</a>`).join("\n");
  if (!opts.dryRun) {
    await Promise.all([
      sendEmail(STAFF_EMAILS, `⏳ ${pending.length} payment${pending.length > 1 ? "s" : ""} still pending — follow up today`, html),
      telegram(tg),
      waTeam(`${pending.length} client payment(s) still not matched to the bank: ${rows.map(r => `${r.b.ref} ${first(r.b.name)} Rs ${money2(r.p.amount)}`).join("; ")}. Check the CRM and follow up.`),
    ]);
    for (const r of rows) await bRef(r.b.id).child(`payments/${r.p.id}`).update({ pendingAlertAt: Date.now() });
  }
  return { pending: pending.length, refs: rows.map(r => r.b.ref) };
}

const esc = (s: string) => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
