// /api/bookings?action=…  — single router for the Bookings module (keeps Vercel's free-tier function count low).
// Code lives in src/bookings/server/*. Public actions need no login; staff actions need a Firebase ID token.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { staffFromRequest, loadRateCard } from "../src/bookings/server/admin.js";
import * as core from "../src/bookings/server/core.js";
import { busyBlocks } from "../src/bookings/shared/pricing.js";
import { withDefaults } from "../src/bookings/shared/rateCard.js";
import { addDays, todayIST } from "../src/bookings/shared/dates.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = String(req.query.action || "");
  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});

  try {
    switch (action) {
      // ── Public ──
      case "config": {   // rate card + busy slots for the booking form
        const from = todayIST(), to = addDays(from, 400);
        try {
          const rc = await loadRateCard();
          const busy = busyBlocks(await core.allBookings(), rc, from, to);
          res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
          return res.json({ rateCard: rc, busy, today: from });
        } catch (e: any) {
          // Server not set up yet (no FIREBASE_SERVICE_ACCOUNT): still let people try the form with default prices.
          console.error("config fallback", e?.message);
          return res.json({ rateCard: withDefaults(null), busy: [], today: from, setupNeeded: true });
        }
      }
      case "create": {
        if (req.method !== "POST") return res.status(405).end();
        const staff = await staffFromRequest(req.headers.authorization);
        return res.json(await core.createBooking(body, staff));
      }
      case "get":
        res.setHeader("Cache-Control", "no-store");
        return res.json(core.publicView(await core.getBooking(String(req.query.id))));
      case "claim":
        if (req.method !== "POST") return res.status(405).end();
        return res.json(await core.claimPayment(String(body.id), body));
      case "devList":   // local demo only (LR_DEV_MOCK) — the real CRM reads Firebase directly
        if (process.env.LR_DEV_MOCK !== "1" || process.env.VERCEL) return res.status(404).end();
        return res.json(Object.fromEntries((await core.allBookings()).map(b => [b.id, b])));
      case "ics": {      // subscribable team calendar: /api/bookings?action=ics&key=…
        const key = process.env.CALENDAR_FEED_KEY;
        if (!key || req.query.key !== key) return res.status(403).send("Forbidden");
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Cache-Control", "s-maxage=300");
        return res.send(await core.icsFeed());
      }
    }

    // ── Staff only ──
    const staff = await staffFromRequest(req.headers.authorization);
    if (!staff) return res.status(401).json({ error: "Please sign in with a Living Root staff account" });
    if (req.method !== "POST") return res.status(405).end();
    switch (action) {
      case "update":        return res.json(await core.updateBooking(String(body.id), body, staff));
      case "addPayment":    return res.json(await core.addPayment(String(body.id), body, staff));
      case "verify":        return res.json(await core.verifyPayment(String(body.id), String(body.paymentId), body.verified !== false, staff, body.notify !== false));
      case "deletePayment": return res.json(await core.deletePayment(String(body.id), String(body.paymentId)));
      case "remind":        return res.json(await core.sendReminderNow(String(body.id)));
      case "runEvening":    return res.json(await core.runEvening({ dryRun: !!body.dryRun }));
      case "runDaily":      if (staff.role !== "admin") return res.status(403).json({ error: "Admin only" });
                            return res.json(await core.runDaily({ dryRun: !!body.dryRun }));
    }
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (e: any) {
    const status = e instanceof core.HttpError ? e.status : 500;
    if (status === 500) console.error(action, e);
    return res.status(status).json({ error: status === 500 ? (e?.message || "Something went wrong") : e.message });
  }
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return {}; } }
