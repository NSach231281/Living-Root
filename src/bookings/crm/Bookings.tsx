// /crm — the Excel-like CRM grid. Click a row (or open /crm?b=<id>) for the booking drawer.
import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCrmCtx } from "./CrmLayout";
import { needsAction, exportXlsx, type Row } from "./data";
import BookingDrawer from "./BookingDrawer";
import { Pill, STAGE_PILL, PAY_PILL } from "../client/ui";
import { describeWhen, STAGE_LABEL, PAY_LABEL, TYPE_LABEL } from "../shared/pricing";
import { fmtDate, inr, todayIST } from "../shared/dates";
import { Download, Search } from "lucide-react";

const VIEWS: [string, string, (r: Row) => boolean][] = [
  ["action", "Needs action", r => !!needsAction(r)],
  ["open", "Enquiries", r => ["enquiry", "quoted"].includes(r.stage)],
  ["upcoming", "Confirmed", r => r.stage === "confirmed"],
  ["done", "Completed", r => r.stage === "completed"],
  ["all", "All", r => !["cancelled", "lost"].includes(r.stage)],
  ["closed", "Cancelled / lost", r => ["cancelled", "lost"].includes(r.stage)],
];

export default function Bookings() {
  const { rows, rc } = useCrmCtx();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(rows.some(r => needsAction(r)) ? "action" : "all");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const openId = params.get("b");

  const filtered = useMemo(() => {
    const f = VIEWS.find(v => v[0] === view)![2];
    const s = q.trim().toLowerCase();
    return rows.filter(r => f(r) && (!type || r.input.type === type) &&
      (!s || [r.name, r.phone, r.email, r.ref, r.quoteNo, r.title, r.organisation, r.m.lastUtr].join(" ").toLowerCase().includes(s)))
      .sort((a, b) => view === "upcoming" ? (a.quote.firstDate || "").localeCompare(b.quote.firstDate || "") : b.createdAt - a.createdAt);
  }, [rows, view, q, type]);

  const today = todayIST();
  const kpi = useMemo(() => {
    const live = rows.filter(r => !["cancelled", "lost"].includes(r.stage));
    const monthStart = today.slice(0, 7);
    return {
      enquiries: rows.filter(r => new Date(r.createdAt + 330 * 60000).toISOString().slice(0, 7) === monthStart).length,
      confirmed: live.filter(r => r.stage === "confirmed" || r.stage === "completed").reduce((s, r) => s + r.quote.grandTotal, 0),
      collected: live.reduce((s, r) => s + r.m.claimedPaid, 0),
      outstanding: live.filter(r => r.stage === "confirmed" || r.stage === "completed").reduce((s, r) => s + Math.max(0, r.m.outstanding), 0),
      verify: rows.filter(r => r.m.pendingVerification > 0).length,
    };
  }, [rows, today]);

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {[["Enquiries this month", kpi.enquiries], ["Confirmed value", inr(kpi.confirmed)], ["Collected", inr(kpi.collected)], ["Outstanding (confirmed)", inr(kpi.outstanding)], ["Screenshots to collect", kpi.verify]].map(([l, v]) =>
          <div key={l as string} className="bg-white rounded-xl border border-brand-border p-3"><div className="text-[10px] uppercase tracking-widest text-brand-muted">{l}</div><div className="font-serif font-bold text-xl">{v}</div></div>)}
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="flex gap-1 overflow-x-auto">{VIEWS.map(([k, l, f]) => {
          const n = rows.filter(f).length;
          return <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${view === k ? "bg-brand-earth text-white" : "bg-white border border-brand-border"}`}>{l} <span className="opacity-60">{n}</span></button>;
        })}</div>
        <div className="flex-1"/>
        <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-brand-muted"/><input className="pl-8 pr-3 py-2 text-sm rounded-lg border border-brand-border w-52" placeholder="Name, phone, ref, UTR…" value={q} onChange={e => setQ(e.target.value)}/></div>
        <select className="py-2 px-2 text-sm rounded-lg border border-brand-border" value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button onClick={() => exportXlsx(filtered, rc)} className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-emerald-700 text-white"><Download size={14}/> Excel</button>
      </div>

      <div className="bg-white rounded-xl border border-brand-border overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-brand-sand/60 text-[10px] uppercase tracking-wider text-brand-clay text-left">
            <tr>{["Ref", "Client", "Mobile", "Event", "Type", "Event date", "Total", "Discount", "Advance", "1st paid", "Paid", "Balance", "Bal. due", "Stage", "Payment", "Action"].map(h => <th key={h} className="px-2 py-2 font-bold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const act = needsAction(r);
              return (
                <tr key={r.id} onClick={() => setParams({ b: r.id })} className={`border-t border-brand-sand cursor-pointer hover:bg-brand-bone ${openId === r.id ? "bg-brand-bone" : ""}`}>
                  <td className="px-2 py-2 font-mono text-xs"><div className="font-bold">{r.ref}</div><div className="text-brand-muted">{r.quoteNo.split("/").slice(-2).join("/")}</div></td>
                  <td className="px-2 py-2"><div className="font-medium">{r.name}</div><div className="text-xs text-brand-muted truncate max-w-[160px]">{r.organisation || r.email}</div></td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{r.phone}</td>
                  <td className="px-2 py-2"><div className="truncate max-w-[160px]">{r.title}</div><div className="text-xs text-brand-muted truncate max-w-[160px]">{describeWhen(r.input, rc)}</div></td>
                  <td className="px-2 py-2 text-xs">{["subscription", "night_subscription"].includes(r.input.type) ? "Subscription" : r.input.type === "custom" ? "Custom" : r.input.event?.need === "both" ? "Ticketed" : r.input.event?.need === "tix" ? "Ticketing only" : "One-time"}{r.input.event?.oneTime === false && <div className="text-[10px] text-brand-spice font-bold">wants plan</div>}{r.input.event?.firstTime && <div className="text-[10px] text-brand-muted">first-timer</div>}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{r.quote.firstDate ? fmtDate(r.quote.firstDate, false) : "—"}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{inr(r.quote.grandTotal)}</td>
                  <td className="px-2 py-2 text-right text-xs text-emerald-700 whitespace-nowrap">{r.quote.discount > 0 ? inr(r.quote.discount) : ""}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{inr(r.quote.advance)}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">{r.m.firstPaidOn ? fmtDate(r.m.firstPaidOn, false) : ""}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{r.m.claimedPaid ? inr(r.m.claimedPaid) : ""}{r.m.pendingVerification > 0 && <div className="text-[10px] text-amber-700 font-bold">screenshot due</div>}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap font-medium">{r.m.outstanding > 0.5 ? inr(r.m.outstanding) : "—"}</td>
                  <td className={`px-2 py-2 text-xs whitespace-nowrap ${r.m.nextDue?.dueDate && r.m.nextDue.dueDate < today ? "text-red-700 font-bold" : ""}`}>{r.m.nextDue?.dueDate ? fmtDate(r.m.nextDue.dueDate, false) : ""}</td>
                  <td className="px-2 py-2"><Pill cls={STAGE_PILL[r.stage]}>{STAGE_LABEL[r.stage]}</Pill></td>
                  <td className="px-2 py-2"><Pill cls={PAY_PILL[r.m.status]}>{PAY_LABEL[r.m.status]}</Pill></td>
                  <td className="px-2 py-2 text-xs font-bold text-brand-spice whitespace-nowrap">{act || ""}</td>
                </tr>);
            })}
            {!filtered.length && <tr><td colSpan={16} className="text-center py-12 text-brand-muted">Nothing here. Share your booking link or tap <b>New</b> to add one.</td></tr>}
          </tbody>
        </table>
      </div>
      {openId && <BookingDrawer id={openId} onClose={() => setParams({})}/>}
    </div>
  );
}
