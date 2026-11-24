// Daily job (Vercel Cron, see vercel.json — 03:00 UTC = 8:30 AM IST):
//   • emails clients whose balance / monthly fee is due today (= the day before the event) or overdue
//   • marks finished, fully-paid events as completed and flags unpaid ones (reconciliation)
//   • sends the team a digest by email + Telegram
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDaily } from "../src/bookings/server/core.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
  try {
    return res.json(await runDaily());
  } catch (e: any) {
    console.error("cron failed", e);
    return res.status(500).json({ error: e?.message });
  }
}
