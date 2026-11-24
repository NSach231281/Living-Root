// Local API server for development: `npm run dev:api` (then `npm run dev` in another terminal).
// With LR_DEV_MOCK=1 it uses an in-memory database (.dev-db.json) and writes emails to .dev-outbox/.
// Without it, it talks to your real Firebase using FIREBASE_SERVICE_ACCOUNT from .env.local.
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const routes: Record<string, () => Promise<any>> = {
  "/api/bookings": () => import("../api/bookings.ts"),
  "/api/cron-daily": () => import("../api/cron-daily.ts"),
  "/api/cron-evening": () => import("../api/cron-evening.ts"),
};
const PORT = Number(process.env.API_PORT || 3001);
http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const load = routes[url.pathname];
  if (!load) { res.statusCode = 404; return res.end("Not found"); }
  let raw = ""; for await (const c of req) raw += c;
  const vreq: any = { method: req.method, headers: req.headers, query: Object.fromEntries(url.searchParams), body: raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : {} };
  const vres: any = {
    status(c: number) { res.statusCode = c; return vres; }, setHeader(k: string, v: string) { res.setHeader(k, v); return vres; },
    json(o: any) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return vres; },
    send(s: string) { res.end(s); return vres; }, end(s?: string) { res.end(s); return vres; },
  };
  try { await (await load()).default(vreq, vres); } catch (e: any) { console.error(e); res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
}).listen(PORT, () => console.log(`Living Root API on http://localhost:${PORT} ${process.env.LR_DEV_MOCK === "1" ? "(mock DB, emails → .dev-outbox/)" : "(real Firebase)"}`));
