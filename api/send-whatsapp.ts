import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilio                                  from "twilio";
import { createClient }                        from "@supabase/supabase-js";

const APP_URL = process.env.VITE_APP_URL || "https://livingrootspace.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const { phone, name, eventTitle, eventDate, eventTime, eventVenue, seats, ticketRef } = req.body ?? {};

  if (!phone || !ticketRef) {
    return res.status(400).json({ error: "phone and ticketRef are required" });
  }

  const rawPhone  = String(phone).replace(/\s+/g, "").replace(/^0/, "");
  const normPhone = rawPhone.startsWith("+") ? rawPhone : `+91${rawPhone.replace(/^91/, "")}`;

  const message = [
    `🌿 *Living Root — Your Event Ticket*`,
    ``,
    `*${eventTitle}*`,
    `📅 ${eventDate}  ⏰ ${eventTime}`,
    `📍 ${eventVenue}`,
    ``,
    `👤 *${name}*  ·  ${seats} seat${Number(seats) > 1 ? "s" : ""}`,
    `🎫 Ref: \`${ticketRef}\``,
    ``,
    `Show this message or scan your QR at the door:`,
    `${APP_URL}/ticket/${ticketRef}`,
    ``,
    `See you there! 🕺✨`,
    `— Living Root Team`,
  ].join("\n");

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      to:   `whatsapp:${normPhone}`,
      body: message,
    });

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    await supabase
      .from("event_registrations")
      .update({ whatsapp_sent: true })
      .eq("ticket_ref", ticketRef);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
    return res.status(500).json({ error: "Failed to send WhatsApp message", detail: err.message });
  }
}
