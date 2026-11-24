// Outbound notifications — all free tiers:
//   • Email: Gmail SMTP (app password, ~500/day) or Resend (3,000/month)
//   • Telegram bot: instant phone alerts for the team (unlimited, free)
//   • Notion: mirrors confirmed bookings into a Notion calendar database (free API)
// Every channel is optional; a missing key just skips that channel.
import nodemailer from "nodemailer";
import { waTeam } from "./whatsapp.js";

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || GMAIL_USER || "onboarding@resend.dev";
const FROM_NAME  = process.env.FROM_NAME || "Living Roots";

export const STAFF_EMAILS = (process.env.STAFF_EMAILS || "livingrootspace@gmail.com")
  .split(",").map(s => s.trim()).filter(Boolean);

export interface Attachment { filename: string; content: string; contentType: string }

let transport: nodemailer.Transporter | null = null;

export async function sendEmail(to: string | string[], subject: string, html: string, attachments: Attachment[] = [], replyTo?: string): Promise<boolean> {
  const list = (Array.isArray(to) ? to : [to]).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || ""));
  if (!list.length) return false;
  if (process.env.LR_DEV_OUTBOX && !process.env.VERCEL) { // local dev: write emails to a folder instead of sending
    const fs = await import("node:fs");
    fs.mkdirSync(process.env.LR_DEV_OUTBOX, { recursive: true });
    fs.writeFileSync(`${process.env.LR_DEV_OUTBOX}/${Date.now()}-${subject.replace(/[^\w]+/g, "_").slice(0, 60)}.html`, `<!-- to: ${list.join(", ")} | attachments: ${attachments.map(a => a.filename).join(",")} -->\n${html}`);
    return true;
  }
  try {
    if (GMAIL_USER && GMAIL_PASS) {
      transport ||= nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
      await transport.sendMail({ from: `"${FROM_NAME}" <${GMAIL_USER}>`, to: list.join(", "), subject, html, replyTo: replyTo || GMAIL_USER, attachments });
      return true;
    }
    if (RESEND_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`, to: list, subject, html, reply_to: replyTo,
          attachments: attachments.map(a => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
        }),
      });
      if (!r.ok) console.error("resend", r.status, await r.text());
      return r.ok;
    }
    console.warn("No email channel configured (set GMAIL_USER + GMAIL_APP_PASSWORD)");
    return false;
  } catch (e) { console.error("sendEmail failed", e); return false; }
}

/** Team alert to a Telegram group/chat. Plain text with simple HTML (<b>, <a>). */
export async function telegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!r.ok) console.error("telegram", r.status, await r.text());
    return r.ok;
  } catch (e) { console.error("telegram failed", e); return false; }
}

/** Email the team + ping Telegram. */
export async function alertStaff(subject: string, html: string, tg: string, waLine?: string) {
  await Promise.all([sendEmail(STAFF_EMAILS, subject, html), telegram(tg), waTeam(waLine || subject.replace(/^\W+\s*/, ""))]);
}

// ── Notion calendar mirror ───────────────────────────────────────────────────
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_DB    = process.env.NOTION_DATABASE_ID || "";
const NV = "2022-06-28";

async function notion(path: string, method: string, body?: any) {
  const r = await fetch(`https://api.notion.com/v1/${path}`, {
    method, headers: { Authorization: `Bearer ${NOTION_TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`notion ${r.status}: ${j?.message || ""}`);
  return j;
}

let notionReady: Promise<string> | null = null;
/** Adds our columns to the Notion database once, returns the title property's name. */
function ensureNotionSchema(): Promise<string> {
  notionReady ||= (async () => {
    const db = await notion(`databases/${NOTION_DB}`, "GET");
    const titleProp = Object.entries<any>(db.properties).find(([, v]) => v.type === "title")?.[0] || "Name";
    const want: Record<string, any> = {
      "When": { date: {} }, "Status": { select: {} }, "Payment": { select: {} }, "Client": { rich_text: {} },
      "Phone": { phone_number: {} }, "Total": { number: { format: "rupee" } }, "Outstanding": { number: { format: "rupee" } },
      "Ref": { rich_text: {} }, "Link": { url: {} },
    };
    const missing = Object.fromEntries(Object.entries(want).filter(([k]) => !db.properties[k]));
    if (Object.keys(missing).length) await notion(`databases/${NOTION_DB}`, "PATCH", { properties: missing });
    return titleProp;
  })().catch(e => { notionReady = null; throw e; });
  return notionReady;
}

export interface NotionRow {
  title: string; start: string; end?: string; status: string; payment: string; client: string; phone: string;
  total: number; outstanding: number; ref: string; link: string; archived?: boolean;
}

/** Create or update the booking's Notion page. Returns the page id (or undefined if Notion is off). */
export async function upsertNotion(pageId: string | undefined, row: NotionRow): Promise<string | undefined> {
  if (!NOTION_TOKEN || !NOTION_DB) return undefined;
  try {
    const titleProp = await ensureNotionSchema();
    const text = (s: string) => [{ text: { content: (s || "").slice(0, 1900) } }];
    const properties: any = {
      [titleProp]: { title: text(row.title) },
      When: { date: { start: row.start, end: row.end || null, time_zone: "Asia/Kolkata" } },
      Status: { select: { name: row.status } }, Payment: { select: { name: row.payment } },
      Client: { rich_text: text(row.client) }, Phone: { phone_number: row.phone || null },
      Total: { number: row.total }, Outstanding: { number: row.outstanding },
      Ref: { rich_text: text(row.ref) }, Link: { url: row.link },
    };
    if (pageId) { await notion(`pages/${pageId}`, "PATCH", { properties, archived: !!row.archived }); return pageId; }
    if (row.archived) return undefined;
    const p = await notion("pages", "POST", { parent: { database_id: NOTION_DB }, properties });
    return p.id;
  } catch (e) { console.error("notion upsert failed", e); return pageId; }
}
