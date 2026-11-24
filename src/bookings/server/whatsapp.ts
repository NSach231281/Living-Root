// WhatsApp messages via Meta's WhatsApp Cloud API (direct — no middleman fees).
// Business-initiated messages must use templates approved by Meta. The template
// names and texts we use are listed in BOOKINGS_SETUP.md (step 9); create them in
// WhatsApp Manager exactly as written. Missing env vars → WhatsApp is skipped.
//
//   WHATSAPP_TOKEN            permanent access token (System User)
//   WHATSAPP_PHONE_NUMBER_ID  the sender number's ID (not the phone number itself)
//   WHATSAPP_LANG             template language code, default "en"
//   STAFF_WHATSAPP            comma-separated team numbers for alerts (optional)

const TOKEN = process.env.WHATSAPP_TOKEN || "";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const LANG = process.env.WHATSAPP_LANG || "en";

export const waEnabled = () => !!(TOKEN && PHONE_ID) || !!(process.env.LR_DEV_OUTBOX && !process.env.VERCEL);

/** "98450 12345" / "+91 98450-12345" / "098450…" → "919845012345" */
export function waNumber(phone: string): string {
  let d = (phone || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d;
}

/** Template bodies, for reference and for the dev outbox. Keep in sync with WhatsApp Manager. */
export const TEMPLATES: Record<string, string> = {
  lr_quote:           "Hi {{1}}, thank you for choosing Living Roots! Your quote for {{2}} on {{3}} is ₹{{4}} including GST. Pay the advance of ₹{{5}} to block your date: {{6}}",
  lr_payment_received:"Hi {{1}}, we have received your payment details of ₹{{2}} for booking {{3}}. Your slot is on hold while we confirm the payment with our bank.",
  lr_booking_confirmed:"Hi {{1}}, your booking {{2}} at Living Roots on {{3}} is confirmed. Paid so far: ₹{{4}}. Balance: ₹{{5}}, due {{6}}. Booking details: {{7}}",
  lr_balance_due:     "Hi {{1}}, a reminder from Living Roots: the balance of ₹{{2}} for {{3}} on {{4}} is due today. Pay here: {{5}}",
  lr_payment_overdue: "Hi {{1}}, the payment of ₹{{2}} for your Living Roots booking {{3}} was due on {{4}} and is still pending. Pay here: {{5}}",
  lr_team_alert:      "Living Roots bookings: {{1}}",
};

/** WhatsApp template parameters may not contain new lines, tabs or 4+ spaces. */
const clean = (s: string | number) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").slice(0, 900) || "-";

export async function sendWa(to: string, template: keyof typeof TEMPLATES, params: (string | number)[]): Promise<boolean> {
  const num = waNumber(to);
  if (num.length < 11) return false;
  const values = params.map(clean);
  if (process.env.LR_DEV_OUTBOX && !process.env.VERCEL) {      // local dev: write to the outbox folder
    const fs = await import("node:fs");
    fs.mkdirSync(process.env.LR_DEV_OUTBOX, { recursive: true });
    const text = TEMPLATES[template].replace(/\{\{(\d+)\}\}/g, (_, i) => values[Number(i) - 1] ?? "");
    fs.writeFileSync(`${process.env.LR_DEV_OUTBOX}/${Date.now()}-WA-${template}-${num}.txt`, text);
    return true;
  }
  if (!TOKEN || !PHONE_ID) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: num, type: "template",
        template: { name: template, language: { code: LANG }, components: [{ type: "body", parameters: values.map(text => ({ type: "text", text })) }] },
      }),
    });
    if (!r.ok) console.error("whatsapp", template, r.status, await r.text());
    return r.ok;
  } catch (e) { console.error("whatsapp failed", e); return false; }
}

export const STAFF_WHATSAPP = (process.env.STAFF_WHATSAPP || "").split(",").map(s => s.trim()).filter(Boolean);

/** One-line alert to every team number. */
export async function waTeam(line: string) {
  await Promise.all(STAFF_WHATSAPP.map(n => sendWa(n, "lr_team_alert", [line])));
}
