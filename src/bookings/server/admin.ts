// Firebase Admin (server only). Bypasses database rules — never import from browser code.
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";
import { withDefaults, type RateCard } from "../shared/rateCard.js";

const DB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL
  || "https://living-root-default-rtdb.asia-southeast1.firebasedatabase.app";

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set (see BOOKINGS_SETUP.md, step 2)");
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const sa = JSON.parse(json);
  if (sa.private_key) sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");
  return sa;
}

let app: App | undefined;
function getApp(): App {
  if (app) return app;
  app = getApps()[0] || initializeApp({ credential: cert(serviceAccount()), databaseURL: DB_URL });
  return app;
}

import { mockDb } from "./devMock.js";
const DEV = process.env.LR_DEV_MOCK === "1" && !process.env.VERCEL;

export const adb = (): any => (DEV ? mockDb : getDatabase(getApp()));
export const aauth = () => getAuth(getApp());

export const APP_URL = (process.env.APP_URL || process.env.VITE_APP_URL || "https://livingrootspace.com").replace(/\/$/, "");

export const STAFF_ROLES = ["admin", "partner", "marketing", "pipeline_manager"];

/** Verifies a Firebase ID token and returns the staff member, or null. */
export async function staffFromRequest(authHeader?: string | string[]): Promise<{ uid: string; email: string; role: string; name: string } | null> {
  const h = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  if (DEV && token === "dev-admin") return { uid: "dev", email: "dev@livingroot.test", role: "admin", name: "Dev Admin" };
  try {
    const t = await aauth().verifyIdToken(token);
    const snap = await adb().ref(`users/${t.uid}`).get();
    const u = snap.val() || {};
    if (!STAFF_ROLES.includes(u.role)) return null;
    return { uid: t.uid, email: t.email || u.email || "", role: u.role, name: u.name || t.email || "staff" };
  } catch { return null; }
}

export async function loadRateCard(): Promise<RateCard> {
  const snap = await adb().ref("crm/config/rateCard").get();
  return withDefaults(snap.val());
}

/** Firebase rejects `undefined`; strip it everywhere. */
export const clean = <T>(o: T): T => JSON.parse(JSON.stringify(o));
