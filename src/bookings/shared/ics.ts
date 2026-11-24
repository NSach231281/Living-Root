// iCalendar (.ics) builder — used for the team's subscribable calendar feed,
// the client's confirmation-email invite, and "Add to calendar" links.
import type { Booking, Session } from "./types.js";
import type { RateCard } from "./rateCard.js";
import { expandSessions } from "./pricing.js";
import { addDays, sessionHours, toMin } from "./dates.js";

const esc = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
const local = (date: string, hhmm: string) => `${date.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;

/** Session end as {date, time}; rolls to the next day for overnight sessions. */
export function sessionEnd(s: Session) {
  const endsNextDay = toMin(s.start) + sessionHours(s.start, s.end) * 60 >= 1440;
  return { date: endsNextDay ? addDays(s.date, 1) : s.date, time: s.end };
}

/** Fold lines at 75 octets per RFC 5545. */
const fold = (line: string) => line.length <= 74 ? line : line.match(/.{1,73}/g)!.join("\r\n ");

export interface IcsEvent { uid: string; date: string; start: string; end: string; title: string; description?: string; url?: string; status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED" }

export function buildIcs(events: IcsEvent[], calName = "Living Roots bookings", method?: "PUBLISH" | "REQUEST"): string {
  const now = stamp(Date.now());
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Living Roots//Bookings//EN", "CALSCALE:GREGORIAN",
    ...(method ? [`METHOD:${method}`] : []), `X-WR-CALNAME:${esc(calName)}`, "X-WR-TIMEZONE:Asia/Kolkata",
    "BEGIN:VTIMEZONE", "TZID:Asia/Kolkata", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0530", "TZOFFSETTO:+0530", "TZNAME:IST", "END:STANDARD", "END:VTIMEZONE",
  ];
  for (const e of events) {
    const end = sessionEnd(e);
    lines.push(
      "BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${now}`,
      `DTSTART;TZID=Asia/Kolkata:${local(e.date, e.start)}`, `DTEND;TZID=Asia/Kolkata:${local(end.date, end.time)}`,
      `SUMMARY:${esc(e.title)}`, `LOCATION:${esc("Living Roots, JP Nagar 5th Phase, Bengaluru")}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []), ...(e.url ? [`URL:${e.url}`] : []),
      `STATUS:${e.status || "CONFIRMED"}`, "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function bookingIcsEvents(b: Booking, rc: RateCard, opts: { forClient?: boolean; appUrl?: string; state?: "booked" | "held" } = {}): IcsEvent[] {
  const sessions = expandSessions(b.input, rc);
  const held = opts.state === "held";
  return sessions.map((s, i) => ({
    uid: `${b.id}-${i}@livingroot`,
    date: s.date, start: s.start, end: s.end,
    title: opts.forClient ? `${b.title} at Living Roots` : `${held ? "[HOLD] " : ""}${b.title} — ${b.name} (${b.ref})`,
    description: opts.forClient
      ? `Booking ${b.ref}. Details & payments: ${opts.appUrl}/b/${b.id}`
      : `${b.name} · ${b.phone}${b.organisation ? ` · ${b.organisation}` : ""}\n${b.purpose}${b.input.guests ? ` · ${b.input.guests} guests` : ""}\nQuote ${b.quoteNo}\n${opts.appUrl}/crm?b=${b.id}`,
    url: opts.appUrl ? (opts.forClient ? `${opts.appUrl}/b/${b.id}` : `${opts.appUrl}/crm?b=${b.id}`) : undefined,
    status: held ? "TENTATIVE" : "CONFIRMED",
  }));
}

/** Google Calendar "add event" link for one session. */
export function googleCalLink(title: string, s: Session, details: string): string {
  const end = sessionEnd(s);
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${local(s.date, s.start)}/${local(end.date, end.time)}`, ctz: "Asia/Kolkata", details, location: "Living Roots, JP Nagar 5th Phase, Bengaluru" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
