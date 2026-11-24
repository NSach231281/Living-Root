// Date helpers that work on plain "YYYY-MM-DD" strings (no timezone surprises).
// Business timezone is IST (Asia/Kolkata, UTC+5:30, no DST).

export const pad = (n: number) => String(n).padStart(2, "0");

export function parseYMD(s: string): Date { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
export function ymd(d: Date): string { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
export function addDays(s: string, n: number): string { const d = parseYMD(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); }
export function addMonths(s: string, n: number): string {
  const d = parseYMD(s); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return ymd(d);
}
export function dow(s: string): number { return parseYMD(s).getUTCDay(); }
export function isWeekend(s: string): boolean { const w = dow(s); return w === 0 || w === 6; }
export function daysBetween(a: string, b: string): number { return Math.round((parseYMD(b).getTime() - parseYMD(a).getTime()) / 86400000); }

/** Today in IST as YYYY-MM-DD. */
export function todayIST(now = Date.now()): string { return ymd(new Date(now + 330 * 60000)); }

export function toMin(t: string): number { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }
export function fromMin(m: number): string { m = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
/** Hours in a session; end <= start means it runs past midnight. */
export function sessionHours(start: string, end: string): number {
  let d = toMin(end) - toMin(start); if (d <= 0) d += 1440; return d / 60;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Sunday, 13 Dec 2026" */
export function fmtDate(s: string, withDay = true): string {
  if (!s) return "";
  const d = parseYMD(s);
  return `${withDay ? DAY[d.getUTCDay()] + ", " : ""}${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "3:00 PM" */
export function fmtTime(t: string): string {
  const m = toMin(t); const h = Math.floor(m / 60) % 24; const mm = m % 60;
  return `${((h + 11) % 12) + 1}:${pad(mm)} ${h < 12 ? "AM" : "PM"}`;
}
export function monthLabel(ym: string): string { const [y, m] = ym.split("-").map(Number); return `${MON[m - 1]} ${y}`; }
export const MONTH_CODE = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export const inr = (v: number, dp = 0) =>
  ((Number(v) || 0) < 0 ? "−₹" : "₹") + Math.abs(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const inr2 = (v: number) => inr(v, 2);
export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
