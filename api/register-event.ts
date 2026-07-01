import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient }                        from "@supabase/supabase-js";
import { Resend }                              from "resend";
import { buildTicketEmail }                    from "../src/lib/ticketEmail.js";

const SUPABASE_URL         = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const RESEND_API_KEY       = process.env.RESEND_API_KEY!;
const APP_URL              = process.env.VITE_APP_URL || "https://livingrootspace.com";
const FROM_EMAIL           = process.env.FROM_EMAIL   || "tickets@livingrootspace.com";

function genTicketRef(): string {
  const ts   = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LR-${ts}-${rand}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const {
    eventId, eventTitle, eventDate, eventTime,
    eventVenue = "Living Root, JP Nagar",
    eventPrice = 0,
    name, email, phone,
    seats      = 1,
    paymentRef = "",
  } = req.body ?? {};

  if (!eventId || !name || !email || !phone) {
    return res.status(400).json({ error: "Missing required fields: eventId, name, email, phone" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const isPaid    = Number(eventPrice) > 0;
  const status    = isPaid && !paymentRef ? "pending_payment" : "confirmed";
  const ticketRef = genTicketRef();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: dbError } = await supabase
    .from("event_registrations")
    .insert({
      event_id:    eventId,
      event_title: eventTitle,
      event_date:  eventDate,
      event_time:  eventTime,
      event_venue: eventVenue,
      event_price: Number(eventPrice),
      name, email, phone,
      seats:       Number(seats),
      ticket_ref:  ticketRef,
      status,
      payment_ref: paymentRef || null,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    });

  if (dbError) {
    console.error("Supabase insert error:", dbError);
    if (dbError.code === "23505") {
      return res.status(409).json({ error: "This email is already registered for this event." });
    }
    return res.status(500).json({ error: "Failed to save registration. Please try again." });
  }

  let emailSent = false;
  try {
    const resend = new Resend(RESEND_API_KEY);
    const { subject, html } = buildTicketEmail({
      name, email, eventTitle, eventDate, eventTime,
      eventVenue, seats: Number(seats), ticketRef,
      appUrl: APP_URL, isPaid, paymentRef,
    });

    const { error: emailError } = await resend.emails.send({
      from:    `Living Root <${FROM_EMAIL}>`,
      to:      email,
      subject,
      html,
    });

    if (!emailError) {
      emailSent = true;
      await supabase
        .from("event_registrations")
        .update({ email_sent: true })
        .eq("ticket_ref", ticketRef);
    }
  } catch (err) {
    console.error("Email send failed:", err);
  }

  return res.status(200).json({
    success: true,
    ticketRef,
    status,
    emailSent,
    message: isPaid
      ? "Registration received! Once we verify your payment, your ticket will be emailed."
      : "Registered! Your ticket has been emailed.",
  });
}
