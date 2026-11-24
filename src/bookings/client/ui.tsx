// Small UI pieces shared by the booking form, client page and CRM.
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import type { Quote } from "../shared/types";
import { inr2, inr, fmtDate } from "../shared/dates";

export function BookingShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-brand-bone">
      <header className="bg-brand-earth text-white print:bg-white print:text-brand-earth">
        <div className={`${wide ? "max-w-5xl" : "max-w-xl"} mx-auto px-4 h-14 flex items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg border border-brand-gold/50 flex items-center justify-center font-serif italic font-bold text-brand-gold">LR</span>
            <span className="font-serif font-bold text-lg">Living Roots</span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gold">JP Nagar · Bengaluru</span>
        </div>
      </header>
      <main className={`${wide ? "max-w-5xl" : "max-w-xl"} mx-auto px-4 py-5 pb-32`}>{children}</main>
    </div>
  );
}

export function Section({ n, title, children, right }: { n?: number | string; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-brand-border p-4 mb-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        {n != null && <span className="w-6 h-6 rounded-full bg-brand-spice text-white text-xs font-bold flex items-center justify-center">{n}</span>}
        <h2 className="font-serif font-bold text-lg text-brand-earth flex-1">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
      <span className="label !mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-brand-muted mt-1">{hint}</span>}
    </label>
  );
}

export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 ${on ? "bg-brand-earth text-white border-brand-earth" : "bg-white text-brand-earth border-brand-border hover:border-brand-spice"}`}>
      {children}
    </button>
  );
}

export function QR({ text, size = 220 }: { text: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: "#2C1810", light: "#ffffff" } }).then(setSrc).catch(() => setSrc("")); }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="UPI QR code" className="rounded-xl"/> : <div style={{ width: size, height: size }} className="bg-brand-sand rounded-xl animate-pulse"/>;
}

export function QuoteTable({ q, compact = false }: { q: Quote; compact?: boolean }) {
  return (
    <div className="text-sm">
      <table className="w-full">
        <tbody>
          {q.lines.map((l, i) => (
            <tr key={i} className="border-b border-brand-sand align-top">
              <td className="py-2 pr-2">
                <div className={`font-medium ${l.amount < 0 ? "text-emerald-700" : ""}`}>{l.label}</div>
                {!compact && l.detail && <div className="text-[11px] text-brand-muted leading-snug">{l.detail}</div>}
              </td>
              <td className={`py-2 text-right whitespace-nowrap ${l.amount < 0 ? "text-emerald-700" : ""}`}>
                {l.waived ? <span className="text-emerald-700 font-bold text-xs">WAIVED</span> : inr2(l.amount)}
              </td>
            </tr>
          ))}
          <Row k="Taxable value" v={inr2(q.taxable)}/>
          {q.igst > 0 ? <Row k={`IGST @${Math.round(q.gstRate * 100)}%`} v={inr2(q.igst)}/> : <>
            <Row k={`CGST @${q.gstRate * 50}%`} v={inr2(q.cgst)}/><Row k={`SGST @${q.gstRate * 50}%`} v={inr2(q.sgst)}/></>}
          {q.deposit > 0 && <Row k="Refundable deposit" v={inr2(q.deposit)}/>}
          <tr><td className="pt-3 font-bold text-base">Total</td><td className="pt-3 text-right font-bold text-base">{inr2(q.grandTotal)}</td></tr>
        </tbody>
      </table>
      {q.savings > 0 && <p className="mt-2 text-xs font-bold text-emerald-700">You save {inr(q.savings)} — {q.savingsPct}% off our standard rate</p>}
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <tr><td className="pt-2 text-brand-muted">{k}</td><td className="pt-2 text-right">{v}</td></tr>;

export function Schedule({ q, money }: { q: Quote; money?: { installments: { id: string; state: string; paid: number; due: number }[] } }) {
  return (
    <div className="space-y-2">
      {q.schedule.map(s => {
        const st = money?.installments.find(i => i.id === s.id);
        const pill = !st ? null : st.state === "paid" ? ["Paid", "bg-emerald-100 text-emerald-800"] : st.state === "overdue" ? ["Overdue", "bg-red-100 text-red-800"] : st.state === "partial" ? ["Part-paid", "bg-amber-100 text-amber-800"] : ["Due", "bg-brand-sand text-brand-clay"];
        return (
          <div key={s.id} className="flex items-center justify-between bg-brand-bone rounded-xl px-3 py-2">
            <div>
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-[11px] text-brand-muted">{s.dueDate ? `Due ${fmtDate(s.dueDate)}` : "On confirmation"}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">{inr2(s.amount)}</div>
              {pill && <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${pill[1]}`}>{pill[0]}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="py-20 text-center text-brand-muted text-sm"><div className="w-8 h-8 mx-auto mb-3 border-2 border-brand-spice border-t-transparent rounded-full animate-spin"/>{label}</div>;
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return children ? <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-3 py-2 my-3">{children}</div> : null;
}

export const STAGE_PILL: Record<string, string> = {
  enquiry: "bg-sky-100 text-sky-800", quoted: "bg-indigo-100 text-indigo-800", confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-stone-200 text-stone-700", cancelled: "bg-red-100 text-red-700", lost: "bg-stone-100 text-stone-500",
};
export const PAY_PILL: Record<string, string> = {
  unpaid: "bg-stone-100 text-stone-600", awaiting_verification: "bg-amber-100 text-amber-800", partial: "bg-orange-100 text-orange-800",
  paid: "bg-emerald-100 text-emerald-800", overpaid: "bg-purple-100 text-purple-800",
};
export const Pill = ({ cls, children }: { cls: string; children: React.ReactNode }) =>
  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap ${cls}`}>{children}</span>;
