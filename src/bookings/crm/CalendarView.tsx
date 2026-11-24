// /crm/calendar — month view of every booked / on-hold / enquired slot.
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCrmCtx } from "./CrmLayout";
import { expandSessions } from "../shared/pricing";
import { addMonths, fmtTime, monthLabel, todayIST, addDays, dow, parseYMD } from "../shared/dates";
import type { Row } from "./data";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Item = { r: Row; start: string; end: string; kind: "booked" | "held" | "enquiry" };
const KIND = { booked: "bg-emerald-600 text-white", held: "bg-amber-400 text-amber-950", enquiry: "bg-sky-100 text-sky-900 border border-dashed border-sky-400" };

export default function CalendarView() {
  const { rows, rc } = useCrmCtx();
  const nav = useNavigate();
  const today = todayIST();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [showEnq, setShowEnq] = useState(true);

  const byDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const r of rows) {
      if (["cancelled", "lost"].includes(r.stage)) continue;
      const kind: Item["kind"] = ["confirmed", "completed"].includes(r.stage) ? "booked" : Object.keys(r.payments || {}).length ? "held" : "enquiry";
      if (kind === "enquiry" && !showEnq) continue;
      for (const s of expandSessions(r.input, rc)) (map[s.date] ||= []).push({ r, start: s.start, end: s.end, kind });
    }
    Object.values(map).forEach(l => l.sort((a, b) => a.start.localeCompare(b.start)));
    return map;
  }, [rows, rc, showEnq]);

  const first = `${ym}-01`;
  const lead = (dow(first) + 6) % 7; // Monday-first grid
  const daysInMonth = parseYMD(addMonths(first, 1)).getTime() / 864e5 - parseYMD(first).getTime() / 864e5;
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => addDays(first, i - lead));

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="p-2 bg-white rounded-lg border border-brand-border" onClick={() => setYm(addMonths(first, -1).slice(0, 7))}><ChevronLeft size={16}/></button>
        <h2 className="font-serif text-xl font-bold w-40 text-center">{monthLabel(ym)}</h2>
        <button className="p-2 bg-white rounded-lg border border-brand-border" onClick={() => setYm(addMonths(first, 1).slice(0, 7))}><ChevronRight size={16}/></button>
        <button className="text-sm px-3 py-2 bg-white rounded-lg border border-brand-border" onClick={() => setYm(today.slice(0, 7))}>Today</button>
        <div className="flex-1"/>
        <div className="hidden sm:flex gap-3 text-xs items-center">
          <span className="flex items-center gap-1"><i className={`w-3 h-3 rounded ${KIND.booked}`}/> Booked</span>
          <span className="flex items-center gap-1"><i className={`w-3 h-3 rounded ${KIND.held}`}/> Paid, verifying</span>
          <label className="flex items-center gap-1"><input type="checkbox" checked={showEnq} onChange={e => setShowEnq(e.target.checked)}/><i className={`w-3 h-3 rounded ${KIND.enquiry}`}/> Enquiries</label>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-brand-border rounded-xl overflow-hidden border border-brand-border text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="bg-brand-sand/70 px-2 py-1 font-bold text-brand-clay">{d}</div>)}
        {cells.map(d => {
          const items = byDate[d] || []; const out = d.slice(0, 7) !== ym;
          return (
            <div key={d} className={`bg-white min-h-[92px] p-1 ${out ? "opacity-40" : ""} ${d === today ? "ring-2 ring-inset ring-brand-spice" : ""}`}>
              <div className="text-right text-[11px] font-bold text-brand-muted">{Number(d.slice(8))}</div>
              {items.slice(0, 4).map((it, i) => (
                <button key={i} onClick={() => nav(`/crm?b=${it.r.id}`)} className={`block w-full text-left truncate rounded px-1 py-0.5 mb-0.5 ${KIND[it.kind]}`} title={`${it.r.title} — ${it.r.name}`}>
                  {fmtTime(it.start).replace(":00", "")} {it.r.name.split(" ")[0]}
                </button>))}
              {items.length > 4 && <div className="text-[10px] text-brand-muted">+{items.length - 4} more</div>}
            </div>);
        })}
      </div>
      <p className="text-xs text-brand-muted mt-3">Want this in Google Calendar / Notion Calendar / your phone? Subscribe to the calendar feed — see Settings → Calendar sync.</p>
    </div>
  );
}
