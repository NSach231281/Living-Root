// LOCAL DEVELOPMENT ONLY — an in-memory stand-in for the Firebase Realtime Database,
// used when LR_DEV_MOCK=1 (see scripts/dev-api.ts). Never active on Vercel.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const FILE = process.env.LR_DEV_DB_FILE || ".dev-db.json";
let root: any = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
const save = () => writeFileSync(FILE, JSON.stringify(root, null, 1));
const parts = (p: string) => p.split("/").filter(Boolean);
const getAt = (p: string) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), root);
function setAt(p: string, v: any) {
  const ks = parts(p); if (!ks.length) { root = v ?? {}; return; }
  let o = root; for (const k of ks.slice(0, -1)) o = o[k] ??= {};
  const last = ks[ks.length - 1];
  if (v === null || v === undefined) delete o[last]; else o[last] = JSON.parse(JSON.stringify(v));
}
const snap = (p: string) => { const v = getAt(p); return { val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))), exists: () => v !== undefined, key: parts(p).pop() }; };

export function mockRef(path: string): any {
  return {
    key: parts(path).pop(),
    child: (c: string) => mockRef(`${path}/${c}`),
    get: async () => snap(path),
    set: async (v: any) => { setAt(path, v); save(); },
    update: async (o: any) => { for (const [k, v] of Object.entries(o)) setAt(`${path}/${k}`, v); save(); },
    remove: async () => { setAt(path, null); save(); },
    push: (v?: any) => { const r = mockRef(`${path}/-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`); if (v !== undefined) r.set(v); return r; },
    transaction: async (fn: (v: any) => any) => { setAt(path, fn(getAt(path) ?? null)); save(); return { committed: true, snapshot: snap(path) }; },
  };
}
export const mockDb = { ref: (p = "") => mockRef(p) };
