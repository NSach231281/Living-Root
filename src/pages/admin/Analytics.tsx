// ─── Analytics ────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useMemo } from "react";
import { onValue, ref, update, set } from "firebase/database";
import { db } from "../../firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const COLORS = ["#1E6B40","#C17B2A","#2471A3","#C0392B","#7D3C98","#D4790A","#2E8B57","#6F4E37"];

export function AdminAnalytics() {
  const [daily,    setDaily]    = useState<any>({});
  const [bookings, setBookings] = useState<any[]>([]);
  const [streams,  setStreams]  = useState<any>({});

  useEffect(() => {
    const u = [
      onValue(ref(db,"/daily"),    s=>setDaily(s.val()||{})),
      onValue(ref(db,"/bookings"), s=>setBookings(Object.values(s.val()||{}))),
      onValue(ref(db,"/streams"),  s=>setStreams(s.val()||{})),
    ];
    return ()=>u.forEach(x=>x());
  },[]);

  // Footfall per stream (aggregate all days)
  const footfallByStream = useMemo(()=>{
    const agg: Record<string,number> = {};
    Object.values(daily).forEach((dayData: any)=>{
      if(typeof dayData!=="object")return;
      Object.entries(dayData).forEach(([sid,entry]: any)=>{
        if(entry?.headcount) agg[sid]=(agg[sid]||0)+Number(entry.headcount);
      });
    });
    return Object.entries(agg).map(([name,v])=>({name,v})).sort((a,b)=>b.v-a.v);
  },[daily]);

  // Bookings by event
  const bookingsByEvent = useMemo(()=>{
    const agg: Record<string,{count:number,rev:number}> = {};
    bookings.forEach((b: any)=>{
      if(!agg[b.eventTitle])agg[b.eventTitle]={count:0,rev:0};
      agg[b.eventTitle].count++;
      agg[b.eventTitle].rev+=(b.totalAmount||0);
    });
    return Object.entries(agg).map(([name,v])=>({name,count:v.count,rev:v.rev})).sort((a,b)=>b.count-a.count);
  },[bookings]);

  // Customer tiers
  const tierData = [
    {name:"Primary",   value:bookings.filter((b: any)=>!b.tier||b.tier==="primary").length,   fill:"#1E5C3A"},
    {name:"Secondary", value:bookings.filter((b: any)=>b.tier==="secondary").length, fill:"#C17B2A"},
    {name:"Premium",   value:bookings.filter((b: any)=>b.tier==="premium").length,   fill:"#7D3C98"},
  ].filter(d=>d.value>0);

  const totalHC = footfallByStream.reduce((s,x)=>s+x.v,0);
  const totalBookings = bookings.length;
  const totalRevenue  = bookings.filter((b: any)=>b.paymentStatus==="paid").reduce((s: number,b: any)=>s+(b.totalAmount||0),0);

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold text-brand-earth mb-1">Analytics</h1>
      <p className="text-sm text-brand-muted mb-8">Footfall, bookings, and revenue performance</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          ["Total footfall",    totalHC,       "across all sessions",     "border-t-brand-spice"],
          ["Total bookings",    totalBookings, "all time",                "border-t-green-500"],
          ["Revenue collected", inr(totalRevenue), "from paid bookings", "border-t-brand-gold"],
          ["Active streams",    footfallByStream.length, "with footfall logged", "border-t-sky-500"],
        ].map(([l,v,s,a]: any)=>(
          <div key={l} className={`bg-white rounded-2xl p-5 border border-brand-border border-t-4 ${a} shadow-card`}>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">{l}</p>
            <p className="font-serif text-2xl font-bold text-brand-earth">{v}</p>
            <p className="text-xs text-brand-muted mt-1">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Footfall by stream */}
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Footfall by stream</h2>
          {footfallByStream.length === 0 ? (
            <div className="text-center py-10 text-brand-muted">Log headcount in Daily Log to see footfall data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={footfallByStream} layout="vertical" margin={{left:60,right:20}}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={60}/>
                <Tooltip formatter={(v: any)=>[v+" pax","Footfall"]}/>
                <Bar dataKey="v" radius={[0,4,4,0]}>
                  {footfallByStream.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bookings by event */}
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Bookings by event</h2>
          {bookingsByEvent.length === 0 ? (
            <div className="text-center py-10 text-brand-muted">No bookings yet.</div>
          ) : (
            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto">
              {bookingsByEvent.map(({name,count,rev})=>(
                <div key={name} className="flex items-center justify-between p-3 bg-brand-sand rounded-xl">
                  <div>
                    <p className="font-bold text-sm text-brand-earth">{name}</p>
                    <p className="text-xs text-brand-muted">{count} booking(s)</p>
                  </div>
                  <p className="font-bold text-brand-earth">{inr(rev)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer breakdown */}
      {tierData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-5">Customer tier breakdown</h2>
          <div className="flex items-center gap-8">
            <PieChart width={180} height={180}>
              <Pie data={tierData} cx={85} cy={85} innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                {tierData.map((entry,i)=><Cell key={i} fill={entry.fill}/>)}
              </Pie>
            </PieChart>
            <div className="flex flex-col gap-3">
              {tierData.map(d=>(
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background:d.fill}}/>
                  <span className="text-sm font-medium text-brand-clay">{d.name}</span>
                  <span className="font-bold text-brand-earth ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback review ─────────────────────────────────────────────────────────
const STATUS: Record<string,{label:string;color:string;bg:string;icon:string}> = {
  new:      {label:"New",      color:"#E0A000",bg:"#FFF9E0",icon:"🟡"},
  accepted: {label:"Accepted", color:"#1E8449",bg:"#E9F7EF",icon:"✅"},
  parked:   {label:"Parked",   color:"#2471A3",bg:"#EAF2FA",icon:"📌"},
  rejected: {label:"Rejected", color:"#C4322E",bg:"#FDECEA",icon:"❌"},
};
const TYPE_COLORS: Record<string,{color:string;bg:string}> = {
  bug:        {color:"#C4322E",bg:"#FDECEA"},
  change:     {color:"#C17B2A",bg:"#FEF5E0"},
  suggestion: {color:"#2471A3",bg:"#EAF2FA"},
  remove:     {color:"#7A8690",bg:"#F2F2F2"},
};
const fmt = (ts: number) => ts ? new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "";

export function AdminFeedback() {
  const [feedback, setFeedback] = useState<any>({});
  const [filter,   setFilter]   = useState("new");
  const [notes,    setNotes]    = useState<Record<string,string>>({});
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(()=>{
    return onValue(ref(db,"/feedback"), s=>setFeedback(s.val()||{}));
  },[]);

  const items = Object.entries(feedback)
    .filter(([,f]: any)=>filter==="all"||f.status===filter)
    .sort(([,a]: any,[,b]: any)=>b.submittedAt-a.submittedAt);

  const counts: Record<string,number> = {all:0,new:0,accepted:0,parked:0,rejected:0};
  Object.values(feedback as any).forEach((f: any)=>{counts.all++;counts[f.status]=(counts[f.status]||0)+1;});

  const updateStatus = (id: string, status: string) => {
    update(ref(db,`/feedback/${id}`),{status,reviewNote:notes[id]||"",reviewedAt:Date.now()});
  };

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold text-brand-earth mb-1">Feedback Review</h1>
      <p className="text-sm text-brand-muted mb-6">Accept, park, or reject — partners see your decision.</p>

      <div className="flex gap-2 flex-wrap mb-6">
        {[["all","All"],["new","New"],["accepted","Accepted"],["parked","Parked"],["rejected","Rejected"]].map(([k,l])=>{
          const st=STATUS[k]||{color:"#1A2830",bg:"#E8EAEB"};
          const active=filter===k;
          return(
            <button key={k} onClick={()=>setFilter(k)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full border-2 transition-all`}
              style={{borderColor:active?st.color:"#DDD9D0",background:active?st.bg:"#fff",color:active?st.color:"#7A8690"}}>
              {l} <span className="ml-1 font-bold">{counts[k]||0}</span>
            </button>
          );
        })}
      </div>

      {items.length===0?(
        <div className="text-center py-16 text-brand-muted bg-white rounded-2xl border border-brand-border">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-serif text-xl text-brand-earth mb-2">No items here</p>
        </div>
      ):items.map(([id,f]: any)=>{
        const st=STATUS[f.status]||STATUS.new;
        const tc=TYPE_COLORS[f.type]||{color:"#7A8690",bg:"#F2F2F2"};
        const isOpen=expanded===id;
        const note=notes[id]??(f.reviewNote||"");
        return(
          <div key={id} className="bg-white rounded-2xl border border-brand-border mb-3 overflow-hidden shadow-card" style={{borderLeft:`5px solid ${tc.color}`}}>
            <div onClick={()=>setExpanded(isOpen?null:id)} className="p-5 cursor-pointer flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{background:tc.bg,color:tc.color}}>{f.type}</span>
                  <span className="text-xs text-brand-muted font-bold">{f.partnerName}</span>
                  <span className="text-xs text-brand-muted">· {f.section}</span>
                </div>
                <p className="font-bold text-brand-earth text-sm">{f.description?.slice(0,100)}{f.description?.length>100?"…":""}</p>
                <p className="text-xs text-brand-muted mt-1">{fmt(f.submittedAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full border" style={{background:st.bg,color:st.color,borderColor:st.color+"40"}}>{st.icon} {st.label}</span>
                <span className="text-brand-muted">{isOpen?"▲":"▼"}</span>
              </div>
            </div>
            {isOpen&&(
              <div className="border-t border-brand-border p-5">
                {[["Section",f.section],["What's the issue/idea",f.description],["Why it matters",f.impact],["Suggested fix",f.suggestion]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} className="mb-3 p-3 bg-brand-sand rounded-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">{l}</p>
                    <p className="text-sm text-brand-earth">{v}</p>
                  </div>
                ))}
                {f.reviewNote&&<div className="mb-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200"><p className="text-xs font-bold uppercase text-yellow-700 mb-1">Your previous note</p><p className="text-sm">{f.reviewNote}</p></div>}
                <div className="mb-4">
                  <label className="label">Review note (optional)</label>
                  <textarea value={note} onChange={e=>setNotes(p=>({...p,[id]:e.target.value}))} placeholder="Add context or reason for your decision…" className="input" rows={3}/>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[["accepted","✅ Accept","#1E8449"],["parked","📌 Park","#2471A3"],["rejected","❌ Reject","#C4322E"]].map(([status,label,color])=>(
                    <button key={status} onClick={()=>updateStatus(id,status)}
                      className="px-5 py-2.5 text-sm font-bold rounded-xl border-2 transition-all"
                      style={{borderColor:color,background:f.status===status?color:"#fff",color:f.status===status?"#fff":color}}>
                      {label}
                    </button>
                  ))}
                  <button onClick={()=>{if(window.confirm("Delete permanently?"))set(ref(db,`/feedback/${id}`),null);}} className="ml-auto text-xs text-brand-muted hover:text-red-500 transition-colors">Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(()=>{
    return onValue(ref(db,"/users"), s=>{
      setUsers(Object.values(s.val()||{}).sort((a: any,b: any)=>b.createdAt-a.createdAt));
    });
  },[]);

  const updateRole = (uid: string, role: string) => update(ref(db,`/users/${uid}`),{role});
  const updateTier = (uid: string, tier: string) => update(ref(db,`/users/${uid}`),{tier});

  const byRole: Record<string,number> = {};
  users.forEach((u: any)=>{byRole[u.role]=(byRole[u.role]||0)+1;});

  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl font-bold text-brand-earth mb-1">Users</h1>
      <p className="text-sm text-brand-muted mb-6">Manage access roles and customer tiers</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[["Total",users.length,"all accounts","border-t-brand-spice"],["Customers",byRole.customer||0,"signed up","border-t-green-500"],["Partners",byRole.partner||0,"operations","border-t-brand-gold"],["Admins",byRole.admin||0,"full access","border-t-purple-500"]].map(([l,v,s,a]: any)=>(
          <div key={l} className={`bg-white rounded-2xl p-5 border border-brand-border border-t-4 ${a} shadow-card`}>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">{l}</p>
            <p className="font-serif text-2xl font-bold text-brand-earth">{v}</p>
            <p className="text-xs text-brand-muted mt-1">{s}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-brand-sand">
              {["User","Email","Role","Tier","Joined","Actions"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-brand-muted">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {users.map((u: any)=>(
                <tr key={u.uid} className="border-t border-brand-border hover:bg-brand-sand/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.photoURL?<img src={u.photoURL} alt="" className="w-7 h-7 rounded-full"/>:<div className="w-7 h-7 rounded-full bg-brand-earth flex items-center justify-center text-brand-gold text-xs font-bold">{u.name?.[0]}</div>}
                      <span className="font-medium text-brand-earth">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={e=>updateRole(u.uid,e.target.value)} className="text-xs border border-brand-border rounded-lg px-2 py-1 bg-white">
                      <option value="customer">Customer</option>
                      <option value="partner">Partner</option>
                      <option value="admin">Admin</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.role==="customer"&&(
                      <select value={u.tier||"primary"} onChange={e=>updateTier(u.uid,e.target.value)} className="text-xs border border-brand-border rounded-lg px-2 py-1 bg-white">
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="premium">Premium</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-muted text-xs">{u.createdAt?new Date(u.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"}):"-"}</td>
                  <td className="px-4 py-3">
                    {u.partnerId&&<span className="badge bg-brand-sand text-brand-clay">{u.partnerId}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length===0&&<div className="text-center py-12 text-brand-muted">No users yet. They'll appear here when they sign in.</div>}
        </div>
      </div>
    </div>
  );
}

// Default exports for routing
export default AdminAnalytics;
