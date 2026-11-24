// /crm/reconcile — (1) match a Yes Bank statement against client payment claims,
//                  (2) post-event check: is every finished event fully paid?
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useCrmCtx } from "./CrmLayout";
import { api } from "../client/api";
import { ErrorBox, Pill, PAY_PILL } from "../client/ui";
import { PAY_LABEL } from "../shared/pricing";
import { daysBetween, fmtDate, inr, inr2, todayIST, ymd } from "../shared/dates";
import type { Row } from "./data";
import { Upload, Check, CheckCheck } from "lucide-react";

interface Credit { i: number; date: string; amount: number; text: string }
interface Match { c: Credit; row?: Row; paymentId?: string; how: "utr" | "ref" | "amount" | "none" }

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function toDate(v: any): string {
  if (v instanceof Date) return ymd(new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())));
  if (typeof v === "number") return ymd(new Date(Math.round((v - 25569) * 864e5))); // Excel serial
  const s = String(v || "").trim();
  let m = s.match(/^(\d{1,2})[\/\-. ](\d{1,2}|[A-Za-z]{3})[\/\-. ](\d{2,4})/);
  if (m) { const mo = isNaN(+m[2]) ? MON[m[2].toLowerCase()] : +m[2]; const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return `${y}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}
const toNum = (v: any) => { const n = Number(String(v ?? "").replace(/[₹,\s]/g, "").replace(/cr$/i, "")); return isNaN(n) ? 0 : n; };

/** Reads any bank statement export (CSV / XLS / XLSX) and returns the credit lines. */
function parseStatement(wb: XLSX.WorkBook): Credit[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  const hIdx = grid.findIndex(r => { const j = r.join("|").toLowerCase(); return j.includes("date") && /(credit|deposit|amount|cr)/.test(j); });
  if (hIdx < 0) throw new Error("Couldn't find the header row (needs a Date column and a Credit/Deposit column).");
  const H = grid[hIdx].map((h: any) => String(h).toLowerCase().trim());
  const col = (...keys: string[]) => H.findIndex(h => keys.some(k => h.includes(k)));
  const cDate = col("txn date", "transaction date", "value date", "date");
  const cCredit = col("credit", "deposit", "cr amount");
  const cAmt = col("amount"); const cDrCr = col("dr/cr", "cr/dr", "type");
  const textCols = H.map((h, i) => /(narration|description|particular|remark|details|ref|utr|cheque|chq)/.test(h) ? i : -1).filter(i => i >= 0);
  const out: Credit[] = [];
  grid.slice(hIdx + 1).forEach((r, i) => {
    let amount = cCredit >= 0 ? toNum(r[cCredit]) : 0;
    if (!amount && cAmt >= 0 && cDrCr >= 0 && /^c/i.test(String(r[cDrCr]).trim())) amount = toNum(r[cAmt]);
    const date = toDate(r[cDate]);
    if (amount > 0 && date) out.push({ i, date, amount, text: textCols.map(c => r[c]).join(" ") });
  });
  return out;
}

export default function Reconcile() {
  const { rows } = useCrmCtx();
  const nav = useNavigate();
  const [credits, setCredits] = useState<Credit[] | null>(null);
  const [file, setFile] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState<Record<number, string>>({});
  const [assign, setAssign] = useState<Record<number, string>>({});
  const today = todayIST();

  async function onFile(f?: File) {
    if (!f) return; setErr(""); setFile(f.name); setDone({});
    try { const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true }); const c = parseStatement(wb); setCredits(c); if (!c.length) setErr("No credit entries found in this file."); }
    catch (e: any) { setErr(e.message); setCredits(null); }
  }

  const unverified = useMemo(() => rows.flatMap(r => Object.values(r.payments || {}).filter(p => !p.verified).map(p => ({ r, p }))), [rows]);
  const matches: Match[] = useMemo(() => {
    if (!credits) return [];
    const used = new Set<string>();
    return credits.map(c => {
      const digits = c.text.replace(/\s+/g, "");
      let hit = unverified.find(x => !used.has(x.p.id) && x.p.utr.length >= 6 && digits.includes(x.p.utr.replace(/\s+/g, "")));
      if (hit) { used.add(hit.p.id); return { c, row: hit.r, paymentId: hit.p.id, how: "utr" as const }; }
      const refRow = rows.find(r => c.text.toUpperCase().includes(r.ref));
      if (refRow) {
        const p = unverified.find(x => x.r.id === refRow.id && !used.has(x.p.id) && Math.abs(x.p.amount - c.amount) < 1);
        if (p) used.add(p.p.id);
        return { c, row: refRow, paymentId: p?.p.id, how: "ref" as const };
      }
      hit = unverified.find(x => !used.has(x.p.id) && Math.abs(x.p.amount - c.amount) < 1 && Math.abs(daysBetween(x.p.paidOn, c.date)) <= 3);
      if (hit) { used.add(hit.p.id); return { c, row: hit.r, paymentId: hit.p.id, how: "amount" as const }; }
      return { c, how: "none" as const };
    });
  }, [credits, unverified, rows]);
  const missing = useMemo(() => {
    if (!credits?.length) return [];
    const from = credits.reduce((a, c) => c.date < a ? c.date : a, "9999"), to = credits.reduce((a, c) => c.date > a ? c.date : a, "");
    const matched = new Set(matches.map(m => m.paymentId).filter(Boolean));
    return unverified.filter(x => !matched.has(x.p.id) && x.p.paidOn >= from && x.p.paidOn <= to);
  }, [credits, matches, unverified]);

  async function act(m: Match, bookingId?: string) {
    const key = m.c.i; setBusy(String(key)); setErr("");
    try {
      if (m.paymentId && m.row) await api.verify(m.row.id, m.paymentId, true);
      else await api.addPayment({ id: bookingId || m.row!.id, amount: m.c.amount, utr: m.c.text.match(/\d{12}/)?.[0] || m.c.text.slice(0, 40), method: "upi", paidOn: m.c.date, source: "bank_statement" });
      setDone(d => ({ ...d, [key]: "✓ verified" }));
    } catch (e: any) { setErr(e.message); }
    setBusy("");
  }
  async function verifyAllUtr() { for (const m of matches.filter(x => x.how === "utr" && !done[x.c.i])) await act(m); }

  const finished = rows.filter(r => ["confirmed", "completed"].includes(r.stage) && r.quote.lastDate && r.quote.lastDate < today)
    .sort((a, b) => b.quote.lastDate.localeCompare(a.quote.lastDate));
  const unpaidFinished = finished.filter(r => r.m.outstanding > 0.5);

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 space-y-6">
      <section className="bg-white rounded-xl border border-brand-border p-4">
        <h2 className="font-serif text-xl font-bold mb-1">1 · Match bank statement</h2>
        <p className="text-sm text-brand-muted mb-3">Download your account statement from Yes Bank net-banking (Excel or CSV) and drop it here. We match every credit to client payments by UTR, by booking reference (LR-XXXXX in the UPI note), or by amount & date.</p>
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-border rounded-xl py-6 cursor-pointer hover:bg-brand-bone">
          <Upload size={18}/><span className="text-sm font-medium">{file || "Choose statement (.xlsx, .xls, .csv)"}</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => onFile(e.target.files?.[0])}/>
        </label>
        <ErrorBox>{err}</ErrorBox>
        {credits && credits.length > 0 && <>
          <div className="flex items-center justify-between mt-4 mb-2">
            <p className="text-sm"><b>{credits.length}</b> credits · <b className="text-emerald-700">{matches.filter(m => m.how === "utr").length}</b> UTR matches · <b>{matches.filter(m => m.how === "ref" || m.how === "amount").length}</b> to check · <b className="text-brand-muted">{matches.filter(m => m.how === "none").length}</b> unrelated</p>
            {matches.some(m => m.how === "utr" && !done[m.c.i]) && <button onClick={verifyAllUtr} disabled={!!busy} className="flex items-center gap-1 bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg"><CheckCheck size={14}/> Verify all UTR matches</button>}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
            <thead className="text-[10px] uppercase tracking-wider text-brand-clay text-left bg-brand-sand/60"><tr><th className="p-2">Date</th><th className="p-2 text-right">Credit</th><th className="p-2">Narration</th><th className="p-2">Match</th><th className="p-2"></th></tr></thead>
            <tbody>{matches.filter(m => m.how !== "none").concat(matches.filter(m => m.how === "none")).map(m => (
              <tr key={m.c.i} className={`border-t border-brand-sand ${m.how === "none" ? "text-brand-muted" : ""}`}>
                <td className="p-2 whitespace-nowrap">{fmtDate(m.c.date, false)}</td>
                <td className="p-2 text-right font-bold whitespace-nowrap">{inr2(m.c.amount)}</td>
                <td className="p-2 text-xs max-w-[260px] truncate" title={m.c.text}>{m.c.text}</td>
                <td className="p-2 text-xs">{m.row ? <button className="text-brand-spice font-bold" onClick={() => nav(`/crm?b=${m.row!.id}`)}>{m.row.ref} · {m.row.name}</button> : "—"}
                  <div className="text-[10px]">{{ utr: "✅ UTR match", ref: m.paymentId ? "✅ Ref + amount" : "🔎 Ref in note — no claim yet", amount: "🔎 Same amount ±3 days — check", none: "" }[m.how]}</div></td>
                <td className="p-2 text-right whitespace-nowrap">{done[m.c.i] ? <span className="text-emerald-700 text-xs font-bold">{done[m.c.i]}</span>
                  : m.row ? <button disabled={!!busy} onClick={() => act(m)} className="flex items-center gap-1 bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg ml-auto"><Check size={12}/>{m.paymentId ? "Verify" : "Record"}</button>
                  : <span className="flex gap-1 justify-end"><select className="text-xs border rounded px-1 py-1 max-w-[150px]" value={assign[m.c.i] || ""} onChange={e => setAssign({ ...assign, [m.c.i]: e.target.value })}>
                      <option value="">Assign to booking…</option>{rows.filter(r => r.m.outstanding > 0.5 && !["cancelled", "lost"].includes(r.stage)).map(r => <option key={r.id} value={r.id}>{r.ref} {r.name} ({inr(r.m.outstanding)})</option>)}</select>
                    {assign[m.c.i] && <button disabled={!!busy} onClick={() => act(m, assign[m.c.i])} className="bg-brand-earth text-white text-xs px-2 rounded">Add</button>}</span>}</td>
              </tr>))}</tbody>
          </table></div>
          {missing.length > 0 && <div className="mt-4 bg-red-50 rounded-xl p-3 text-sm"><b className="text-red-800">Claimed by clients but NOT in this statement ({missing.length})</b>
            {missing.map(({ r, p }) => <div key={p.id} className="text-xs mt-1">{r.ref} {r.name} — {inr2(p.amount)} on {fmtDate(p.paidOn, false)}, UTR <span className="font-mono">{p.utr}</span> — <button className="text-brand-spice font-bold" onClick={() => nav(`/crm?b=${r.id}`)}>open</button></div>)}</div>}
        </>}
      </section>

      <section className="bg-white rounded-xl border border-brand-border p-4">
        <h2 className="font-serif text-xl font-bold mb-1">2 · Finished events</h2>
        <p className="text-sm text-brand-muted mb-3">Every event that's over, and whether it's fully paid. Fully-paid ones are marked completed automatically each morning; unpaid ones stay here (and in the daily digest) until they're settled.
          {unpaidFinished.length > 0 && <b className="text-red-700"> {unpaidFinished.length} unpaid · {inr(unpaidFinished.reduce((s, r) => s + r.m.outstanding, 0))} outstanding.</b>}</p>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
          <thead className="text-[10px] uppercase tracking-wider text-brand-clay text-left bg-brand-sand/60"><tr><th className="p-2">Event ended</th><th className="p-2">Booking</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Outstanding</th><th className="p-2">Status</th></tr></thead>
          <tbody>{finished.slice(0, 100).map(r => (
            <tr key={r.id} onClick={() => nav(`/crm?b=${r.id}`)} className={`border-t border-brand-sand cursor-pointer hover:bg-brand-bone ${r.m.outstanding > 0.5 ? "bg-red-50/60" : ""}`}>
              <td className="p-2 whitespace-nowrap">{fmtDate(r.quote.lastDate, false)}</td>
              <td className="p-2"><b>{r.ref}</b> {r.name}<div className="text-xs text-brand-muted">{r.title}</div></td>
              <td className="p-2 text-right">{inr(r.quote.grandTotal)}</td><td className="p-2 text-right">{inr(r.m.claimedPaid)}</td>
              <td className={`p-2 text-right font-bold ${r.m.outstanding > 0.5 ? "text-red-700" : "text-emerald-700"}`}>{r.m.outstanding > 0.5 ? inr(r.m.outstanding) : "✓ 0"}</td>
              <td className="p-2"><Pill cls={PAY_PILL[r.m.status]}>{PAY_LABEL[r.m.status]}</Pill></td>
            </tr>))}
            {!finished.length && <tr><td colSpan={6} className="p-6 text-center text-brand-muted">No finished events yet.</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  );
}
