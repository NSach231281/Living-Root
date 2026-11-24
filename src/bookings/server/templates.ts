// Email templates. Inline styles only (email clients ignore <style>).
import type { Booking, MoneyStatus, Payment, Installment } from "../shared/types.js";
import type { RateCard } from "../shared/rateCard.js";
import { describeWhen, TYPE_LABEL, PAY_LABEL, STAGE_LABEL } from "../shared/pricing.js";
import { fmtDate, inr, inr2 } from "../shared/dates.js";

const C = { earth: "#2C1810", bone: "#F5F0E8", spice: "#C4622D", sand: "#E8DCC8", muted: "#9C8672", border: "#D4C4A8", green: "#1F7A4D" };

function shell(title: string, body: string, rc: RateCard) {
  return `<!doctype html><html><body style="margin:0;background:${C.bone};font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.earth}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bone};padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${C.border};border-radius:16px;overflow:hidden">
<tr><td style="background:${C.earth};padding:18px 24px;color:#fff"><span style="font-family:Georgia,serif;font-size:20px;font-weight:bold">Living Roots</span>
<span style="float:right;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4A843;padding-top:6px">${title}</span></td></tr>
<tr><td style="padding:24px">${body}</td></tr>
<tr><td style="padding:16px 24px;background:${C.sand};font-size:11px;color:${C.muted};line-height:1.6">
${rc.address}<br>${rc.phone} · ${rc.email} · GSTIN ${rc.gstin}</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${C.spice};color:#fff;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:12px 22px;border-radius:999px">${label}</a>`;

const row = (k: string, v: string, bold = false) =>
  `<tr><td style="padding:6px 0;color:${C.muted};font-size:13px">${k}</td><td style="padding:6px 0;text-align:right;font-size:13px;${bold ? "font-weight:bold" : ""}">${v}</td></tr>`;

const esc = (s: string) => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function summary(b: Booking, rc: RateCard, m?: MoneyStatus) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.border};border-bottom:1px solid ${C.border};margin:16px 0">
${row("Booking", `${esc(b.title)} · ${b.ref}`)}
${row("When", esc(describeWhen(b.input, rc)))}
${row("Type", TYPE_LABEL[b.input.type])}
${row("Quote no.", b.quoteNo)}
${row("Total (incl. GST)", inr2(b.quote.grandTotal), true)}
${m ? row("Paid so far", inr2(m.claimedPaid)) + row("Outstanding", inr2(Math.max(0, m.outstanding)), true) : ""}
</table>`;
}

const first = (n: string) => esc((n || "").split(" ")[0] || "there");

export function clientEnquiry(b: Booking, rc: RateCard, link: string) {
  const adv = b.quote.schedule.filter(s => s.dueDate === "").reduce((s, x) => s + x.amount, 0);
  return {
    subject: `Your Living Roots quote ${b.quoteNo} — ${b.title}`,
    html: shell("Quotation", `<p style="font-size:15px">Hi ${first(b.name)},</p>
<p style="font-size:14px;line-height:1.6">Thank you for your enquiry. Your quotation is ready below. <b>Your date is blocked as soon as the advance of ${inr2(adv)} is paid</b> — scan the QR on your booking page with any UPI app.</p>
${summary(b, rc)}
<p style="text-align:center;margin:24px 0">${btn(link, `View quote & pay ${inr(adv)}`)}</p>
<p style="font-size:12px;color:${C.muted}">This quote is valid for ${rc.quoteValidDays} days and is subject to availability until the advance is received.</p>`, rc),
  };
}

export function clientPaymentNoted(b: Booking, rc: RateCard, p: Payment, link: string) {
  return {
    subject: `Payment received — ${b.ref} (${inr(p.amount)})`,
    html: shell("Payment received", `<p style="font-size:15px">Hi ${first(b.name)},</p>
<p style="font-size:14px;line-height:1.6">We've received your payment details of <b>${inr2(p.amount)}</b> (UPI ref <b>${esc(p.utr)}</b>). Our team is matching it with the bank — you'll get a confirmation shortly. Your slot is on hold for you in the meantime.</p>
${summary(b, rc)}
<p style="text-align:center;margin:24px 0">${btn(link, "View booking")}</p>`, rc),
  };
}

export function clientConfirmed(b: Booking, rc: RateCard, m: MoneyStatus, link: string, firstConfirm: boolean, p?: Payment) {
  const next = m.nextDue;
  return {
    subject: firstConfirm ? `Booking confirmed ✅ ${b.title} — ${b.ref}` : `Payment confirmed — ${b.ref} (${inr(p?.amount || 0)})`,
    html: shell(firstConfirm ? "Confirmed" : "Receipt", `<p style="font-size:15px">Hi ${first(b.name)},</p>
<p style="font-size:14px;line-height:1.6">${firstConfirm
      ? `Your booking is <b style="color:${C.green}">confirmed</b> and the date is blocked on our calendar. A calendar invite is attached.`
      : `We've confirmed your payment of <b>${inr2(p?.amount || 0)}</b>. Thank you!`}</p>
${summary(b, rc, m)}
${next ? `<p style="font-size:14px;line-height:1.6;background:${C.bone};padding:12px 14px;border-radius:10px">Next payment: <b>${inr2(next.due)}</b> (${esc(next.label)}) due <b>${next.dueDate ? fmtDate(next.dueDate) : "now"}</b>. We'll remind you the day it's due.</p>` : `<p style="font-size:14px;color:${C.green};font-weight:bold">You're fully paid. See you at Living Roots!</p>`}
<p style="text-align:center;margin:24px 0">${btn(link, "View booking")}</p>`, rc),
  };
}

export function clientReminder(b: Booking, rc: RateCard, inst: Installment & { due: number }, when: "today" | "overdue", link: string) {
  return {
    subject: when === "overdue" ? `Payment overdue — ${b.ref} (${inr(inst.due)})` : `Balance due today — ${b.title} (${inr(inst.due)})`,
    html: shell("Payment reminder", `<p style="font-size:15px">Hi ${first(b.name)},</p>
<p style="font-size:14px;line-height:1.6">${when === "overdue"
      ? `A payment of <b>${inr2(inst.due)}</b> (${esc(inst.label)}) for your booking was due on <b>${fmtDate(inst.dueDate)}</b> and is still pending.`
      : `Your <b>${esc(inst.label.toLowerCase())}</b> of <b>${inr2(inst.due)}</b> is due today, ahead of your booking on <b>${fmtDate(b.quote.firstDate)}</b>.`}
 Scan the QR on your booking page with any UPI app, then tap “I've paid”.</p>
${summary(b, rc)}
<p style="text-align:center;margin:24px 0">${btn(link, `Pay ${inr(inst.due)}`)}</p>
<p style="font-size:12px;color:${C.muted}">Already paid? Just reply to this email with your UPI reference and we'll update it.</p>`, rc),
  };
}

// ── Staff ────────────────────────────────────────────────────────────────────

export function staffNewEnquiry(b: Booking, rc: RateCard, crm: string) {
  return {
    subject: `🆕 Enquiry: ${b.title} — ${b.name} (${inr(b.quote.grandTotal)})`,
    html: shell("New enquiry", `<p style="font-size:14px"><b>${esc(b.name)}</b> · ${esc(b.phone)} · ${esc(b.email)}${b.organisation ? ` · ${esc(b.organisation)}` : ""}<br>
Source: ${b.source}${b.sourceDetail ? ` (${esc(b.sourceDetail)})` : ""}${b.createdBy ? ` · by ${esc(b.createdBy)}` : ""}</p>
${summary(b, rc)}${b.requests ? `<p style="font-size:13px"><b>Requests:</b> ${esc(b.requests)}</p>` : ""}
<p style="text-align:center;margin:20px 0">${btn(crm, "Open in CRM")}</p>`, rc),
    tg: `🆕 <b>New enquiry</b> ${b.ref}\n${esc(b.title)} — ${esc(b.name)} (${esc(b.phone)})\n${esc(describeWhen(b.input, rc))}\nTotal ${inr(b.quote.grandTotal)} · ${b.source}\n<a href="${crm}">Open in CRM</a>`,
  };
}

export function staffPaymentClaim(b: Booking, rc: RateCard, p: Payment, crm: string, askLink: string, conflict?: string) {
  return {
    subject: `📸 Collect screenshot — ${b.name} paid ${inr(p.amount)} (${b.ref})`,
    html: shell("Payment received", `<p style="font-size:14px"><b>${esc(b.name)}</b> (${esc(b.phone)}) paid <b>${inr2(p.amount)}</b> on ${fmtDate(p.paidOn)} · UPI ref <b>${esc(p.utr)}</b>.<br>The booking is confirmed for the client.</p>
${conflict ? `<p style="background:#FDECEA;color:#8A1C1C;padding:10px;border-radius:8px;font-size:13px">⚠️ ${esc(conflict)}</p>` : ""}
${summary(b, rc)}<p style="font-size:13px"><b>Next:</b> ask the client for the payment screenshot on WhatsApp, check it against the Yes Bank app, and upload it on the booking in the CRM.</p>
<p style="text-align:center;margin:20px 0">${btn(askLink, "Ask for screenshot")} &nbsp; ${btn(crm, "Open in CRM")}</p>`, rc),
    tg: `📸 <b>Payment received</b> ${b.ref}\n${esc(b.name)} — ${inr2(p.amount)}\nUPI ref <code>${esc(p.utr)}</code>${conflict ? `\n⚠️ ${esc(conflict)}` : ""}\n<a href="${askLink}">Ask for screenshot</a> · <a href="${crm}">Upload in CRM</a>`,
  };
}

export interface DigestItem { b: Booking; m: MoneyStatus; note: string }
export function staffDigest(rc: RateCard, sections: { title: string; items: DigestItem[] }[], crm: string) {
  const nonEmpty = sections.filter(s => s.items.length);
  const body = nonEmpty.map(s => `<h3 style="font-family:Georgia,serif;font-size:16px;margin:20px 0 8px">${esc(s.title)} (${s.items.length})</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;border-collapse:collapse">${s.items.map(({ b, m, note }) =>
    `<tr style="border-bottom:1px solid ${C.sand}"><td style="padding:6px 4px"><a href="${crm}?b=${b.id}" style="color:${C.spice};font-weight:bold">${b.ref}</a><br>${esc(b.name)}</td>
<td style="padding:6px 4px">${esc(b.title)}<br><span style="color:${C.muted}">${esc(describeWhen(b.input, rc))}</span></td>
<td style="padding:6px 4px;text-align:right">${inr(Math.max(0, m.outstanding))} due<br><span style="color:${C.muted}">${PAY_LABEL[m.status]} · ${STAGE_LABEL[b.stage]}</span></td>
<td style="padding:6px 4px;color:${C.muted}">${esc(note)}</td></tr>`).join("")}</table>`).join("");
  const count = nonEmpty.reduce((s, x) => s + x.items.length, 0);
  return {
    subject: `Living Roots daily bookings — ${count} item${count === 1 ? "" : "s"} need attention`,
    html: shell("Daily digest", (body || `<p>Nothing needs attention today. 🌿</p>`) + `<p style="text-align:center;margin:24px 0">${btn(crm, "Open CRM")}</p>`, rc),
    tg: `🌿 <b>Daily bookings</b>\n` + (nonEmpty.map(s => `\n<b>${esc(s.title)}</b>\n` + s.items.slice(0, 12).map(({ b, m, note }) =>
      `• ${b.ref} ${esc(b.name)} — ${inr(Math.max(0, m.outstanding))} due · ${esc(note)}`).join("\n")).join("\n") || "\nAll clear today.") + `\n\n<a href="${crm}">Open CRM</a>`,
  };
}
