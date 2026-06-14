import React, { useEffect, useState, useMemo } from "react";
import { onValue, ref, push } from "firebase/database";
import { db } from "../../firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Plus } from "lucide-react";

const inr = (v: number) => "₹" + Math.round(Math.abs(v)).toLocaleString("en-IN");

// Financial model targets from your Excel (hardcoded from V3)
const MONTHLY_OPEX = 195000; // ₹1.95L/month base ops
const MONTHLY_RENT = 70000;
const MONTHLY_ELEC = 25000;

const CATEGORIES = ["Rent","Electricity","Carpenter","Painter","Marketing","Miscellaneous","AV","Furniture","Glass","AC","Electrical"];
const PARTNERS   = ["Nitin","Shruthi","Siva","Anusha"];
const STREAMS    = ["kids","yoga","senior","social","events_in","members","offsite","workshop","events_out","coffee_shop","misc"];

export default function AdminFinancials() {
  const [daily, setDaily]     = useState<any>({});
  const [newEntry, setNew]    = useState({ date:"", type:"Exp", amount:"", stream:"misc", category:"Miscellaneous", loggedBy:"Nitin", note:"" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    return onValue(ref(db, "/daily"), s => setDaily(s.val() || {}));
  }, []);

  // Flatten all daily entries
  const allEntries = useMemo(() => {
    const entries: any[] = [];
    Object.entries(daily).forEach(([date, streams]: any) => {
      if (typeof streams !== "object") return;
      Object.entries(streams).forEach(([streamId, entry]: any) => {
        if (entry && (entry.headcount !== undefined || entry.amount)) {
          entries.push({ date, streamId, ...entry });
        }
      });
    });
    return entries;
  }, [daily]);

  // Also read direct financial entries from /finance path
  const [finance, setFinance] = useState<any[]>([]);
  useEffect(() => {
    return onValue(ref(db, "/finance"), s => {
      const data = s.val() || {};
      setFinance(Object.values(data));
    });
  }, []);

  const totalExp  = finance.filter((e: any) => e.type === "Exp").reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const totalRev  = finance.filter((e: any) => e.type === "Rev").reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const netPL     = totalRev - totalExp;

  // Group by category
  const byCategory: Record<string,number> = {};
  finance.filter((e: any) => e.type === "Exp").forEach((e: any) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0);
  });
  const catChart = Object.entries(byCategory).map(([name, v]) => ({ name, v })).sort((a,b)=>b.v-a.v);

  // Group by month
  const byMonth: Record<string,{rev:number,exp:number}> = {};
  finance.forEach((e: any) => {
    if (!e.date) return;
    const m = e.date.slice(0,7);
    if (!byMonth[m]) byMonth[m] = {rev:0,exp:0};
    if (e.type === "Rev") byMonth[m].rev += Number(e.amount)||0;
    else byMonth[m].exp += Number(e.amount)||0;
  });
  const monthChart = Object.entries(byMonth).sort().map(([m,v])=>({name:m.slice(5)+"/"+m.slice(2,4),...v,net:v.rev-v.exp}));

  // Group by partner
  const byPartner: Record<string,number> = {};
  finance.filter((e: any) => e.type === "Exp").forEach((e: any) => {
    const p = e.loggedBy || "Unknown";
    byPartner[p] = (byPartner[p] || 0) + (Number(e.amount) || 0);
  });

  const addEntry = async () => {
    if (!newEntry.date || !newEntry.amount) return;
    await push(ref(db, "/finance"), { ...newEntry, amount: Number(newEntry.amount), addedAt: Date.now() });
    setNew({ date:"", type:"Exp", amount:"", stream:"misc", category:"Miscellaneous", loggedBy:"Nitin", note:"" });
    setShowForm(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-earth">Financials</h1>
          <p className="text-sm text-brand-muted">Live P&L from all partner transactions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> Log transaction
        </button>
      </div>

      {/* Add entry form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 mb-6 shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Log a transaction</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="label">Date *</label><input type="date" value={newEntry.date} onChange={e=>setNew(p=>({...p,date:e.target.value}))} className="input"/></div>
            <div><label className="label">Type</label>
              <select value={newEntry.type} onChange={e=>setNew(p=>({...p,type:e.target.value}))} className="input">
                <option value="Exp">Expense</option>
                <option value="Rev">Revenue</option>
              </select>
            </div>
            <div><label className="label">Amount (₹) *</label><input type="number" value={newEntry.amount} onChange={e=>setNew(p=>({...p,amount:e.target.value}))} className="input" placeholder="0"/></div>
            <div><label className="label">Category</label>
              <select value={newEntry.category} onChange={e=>setNew(p=>({...p,category:e.target.value}))} className="input">
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Logged by</label>
              <select value={newEntry.loggedBy} onChange={e=>setNew(p=>({...p,loggedBy:e.target.value}))} className="input">
                {PARTNERS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="label">Notes</label><input type="text" value={newEntry.note} onChange={e=>setNew(p=>({...p,note:e.target.value}))} className="input" placeholder="Brief description"/></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={()=>setShowForm(false)} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={addEntry} className="btn-primary flex-1 text-sm">Save</button>
          </div>
        </div>
      )}

      {/* P&L summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label:"Total revenue",   value:inr(totalRev), accent:"border-t-green-500", sub:"logged to date"         },
          { label:"Total expenses",  value:inr(totalExp), accent:"border-t-red-400",   sub:"all categories"         },
          { label:"Net P&L",         value:(netPL>=0?"+":"-")+inr(netPL), accent:`border-t-${netPL>=0?"green":"red"}-500`, sub:netPL>=0?"Profitable":"Burning cash" },
          { label:"Monthly opex target", value:inr(MONTHLY_OPEX), accent:"border-t-brand-gold", sub:"from financial model" },
        ].map(c=>(
          <div key={c.label} className={`bg-white rounded-2xl p-5 border border-brand-border border-t-4 ${c.accent} shadow-card`}>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">{c.label}</p>
            <p className="font-serif text-2xl font-bold text-brand-earth">{c.value}</p>
            <p className="text-xs text-brand-muted mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Monthly revenue vs expense</h2>
          {monthChart.length === 0 ? (
            <div className="text-center py-10 text-brand-muted">No data yet — log transactions to see trends.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthChart}>
                <XAxis dataKey="name" tick={{fontSize:11}} />
                <YAxis hide />
                <Tooltip formatter={(v: any) => [inr(v), ""]} />
                <Legend />
                <Bar dataKey="rev" name="Revenue" fill="#1E5C3A" radius={[4,4,0,0]} />
                <Bar dataKey="exp" name="Expense" fill="#C4322E" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense by category */}
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Expenses by category</h2>
          {catChart.length === 0 ? (
            <div className="text-center py-10 text-brand-muted">No expense data yet.</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {catChart.map(({name,v},i)=>(
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-brand-clay w-24 flex-shrink-0">{name}</span>
                  <div className="flex-1 bg-brand-sand rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-brand-spice rounded-full" style={{width:`${Math.min(100,(v/totalExp)*100)}%`}}/>
                  </div>
                  <span className="text-sm font-bold text-brand-earth w-24 text-right flex-shrink-0">{inr(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By partner */}
      {Object.keys(byPartner).length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card mb-6">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Expenses logged by partner</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(byPartner).map(([p,v])=>(
              <div key={p} className="text-center p-4 bg-brand-sand rounded-2xl">
                <p className="font-bold text-brand-earth text-xl">{inr(v)}</p>
                <p className="text-xs text-brand-muted uppercase tracking-widest mt-1">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction log */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border">
          <h2 className="font-serif text-lg font-bold text-brand-earth">Transaction log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-brand-sand">
              {["Date","Type","Amount","Category","By","Notes"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-brand-muted">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...finance].reverse().map((e: any,i)=>(
                <tr key={i} className="border-t border-brand-border hover:bg-brand-sand/30">
                  <td className="px-4 py-3 text-brand-muted">{e.date}</td>
                  <td className="px-4 py-3"><span className={`badge ${e.type==="Rev"?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>{e.type==="Rev"?"Revenue":"Expense"}</span></td>
                  <td className="px-4 py-3 font-bold" style={{color:e.type==="Rev"?"#1E5C3A":"#C4322E"}}>{e.type==="Rev"?"+":"-"}{inr(Number(e.amount))}</td>
                  <td className="px-4 py-3 text-brand-clay">{e.category}</td>
                  <td className="px-4 py-3 text-brand-muted">{e.loggedBy}</td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {finance.length === 0 && <div className="text-center py-12 text-brand-muted">No transactions logged yet. Use the button above to add your first entry.</div>}
        </div>
      </div>
    </div>
  );
}
