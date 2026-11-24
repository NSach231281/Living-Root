// Evening job (Vercel Cron, see vercel.json — 15:30 UTC = 9:00 PM IST):
// tells the team which client payments ("I've paid") are still not matched to the bank,
// with one-tap links to verify in the CRM or ask the client to pay again.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runEvening } from "../src/bookings/server/core.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
  try { return res.json(await runEvening()); }
  catch (e: any) { console.error("evening cron failed", e); return res.status(500).json({ error: e?.message }); }
}
