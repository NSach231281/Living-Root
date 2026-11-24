// Browser-side calls to /api/bookings. Staff calls attach the Firebase ID token.
import { auth } from "../../firebase";
import type { RateCard } from "../shared/rateCard";
import type { BusyBlock, PublicBooking } from "../shared/types";

/** `npm run demo`: local demo with an in-memory database and no Google login. */
export const DEMO = import.meta.env.VITE_LR_DEMO === "1" && import.meta.env.DEV;

async function call<T>(action: string, opts: { method?: "GET" | "POST"; body?: any; query?: Record<string, string>; staff?: boolean } = {}): Promise<T> {
  const q = new URLSearchParams({ action, ...(opts.query || {}) });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const u = auth.currentUser;
  if (u && opts.staff !== false) headers.Authorization = `Bearer ${await u.getIdToken()}`;
  else if (DEMO && opts.staff !== false) headers.Authorization = "Bearer dev-admin";
  const r = await fetch(`/api/bookings?${q}`, { method: opts.method || (opts.body ? "POST" : "GET"), headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
  if (!r.ok) throw new Error(j.error || `Server error (${r.status})`);
  return j as T;
}

export const api = {
  config: () => call<{ rateCard: RateCard; busy: BusyBlock[]; today: string }>("config", { staff: false }),
  create: (body: any, asStaff: boolean) => call<{ booking: PublicBooking; link: string; conflicts: { ref: string; date: string; state: string }[] }>("create", { body, staff: asStaff }),
  get: (id: string) => call<PublicBooking>("get", { query: { id }, staff: false }),
  claim: (body: any) => call<PublicBooking>("claim", { body, staff: false }),
  update: (body: any) => call<{ booking: PublicBooking }>("update", { body }),
  addPayment: (body: any) => call<any>("addPayment", { body }),
  verify: (id: string, paymentId: string, verified = true, notify = true) => call<any>("verify", { body: { id, paymentId, verified, notify } }),
  uploadProof: (id: string, paymentId: string, image: string) => call<any>("uploadProof", { body: { id, paymentId, image } }),
  getProof: (id: string, paymentId: string) => call<{ image: string; at: number; by: string }>("getProof", { body: { id, paymentId } }),
  deletePayment: (id: string, paymentId: string) => call<any>("deletePayment", { body: { id, paymentId } }),
  remind: (id: string) => call<any>("remind", { body: { id } }),
  devList: () => call<Record<string, any>>("devList"),
  runEvening: (dryRun: boolean) => call<any>("runEvening", { body: { dryRun } }),
  runDaily: (dryRun: boolean) => call<any>("runDaily", { body: { dryRun } }),
};

/** wa.me link to a client's number (Indian numbers default to +91). */
export function waLink(phone: string, text: string) {
  let d = (phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

/** Shrinks a photo/screenshot to ≤1200px JPEG (~100–200 KB) before upload. */
export function compressImage(file: File, max = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't an image we can read")); };
    img.src = url;
  });
}
