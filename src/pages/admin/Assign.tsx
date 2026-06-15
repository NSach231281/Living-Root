import React, { useEffect, useState } from "react";
import { onValue, ref, set, update } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

const BASE_PARTNERS = [
  { id:"nitin",   name:"Nitin",   color:"#1A2830", emoji:"👑" },
  { id:"shruthi", name:"Shruthi", color:"#C0392B", emoji:"🌸" },
  { id:"siva",    name:"Siva",    color:"#2471A3", emoji:"⚡" },
  { id:"anusha",  name:"Anusha",  color:"#1E8449", emoji:"🌿" },
];

const ALL_STREAMS = [
  { id:"kids",        label:"Kids Activity",             type:"community", fixed:false },
  { id:"yoga",        label:"Wellness / Yoga",           type:"community", fixed:false },
  { id:"senior",      label:"Senior Citizen",            type:"community", fixed:false },
  { id:"social",      label:"Evening Social",            type:"community", fixed:false },
  { id:"events_in",   label:"Ticketed Events (TLR)",     type:"community", fixed:false },
  { id:"members",     label:"Membership",                type:"community", fixed:false },
  { id:"coffee_shop", label:"Coffee Shop Collaborator",  type:"community", fixed:true  },
  { id:"offsite",     label:"Corporate Off-sites",       type:"corporate", fixed:false },
  { id:"workshop",    label:"Workshop / Room Rental",    type:"corporate", fixed:false },
  { id:"events_out",  label:"Events Outside TLR",        type:"corporate", fixed:false },
];

const STREAM_COLORS: Record<string,string> = {
  kids:"#D4790A", yoga:"#1E6B40", senior:"#2E8B57", social:"#27AE60",
  events_in:"#2471A3", members:"#7D3C98", coffee_shop:"#6F4E37",
  offsite:"#B7770D", workshop:"#C67C1A", events_out:"#1A5276",
};

const C = { border:"#DDD9D0", muted:"#7A8690", dark:"#1A2830",
            red:"#C4322E", community:"#1E5C3A", corporate:"#C17B2A" };
const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const todayStr = () => new Date().toISOString().split("T")[0];

export default function AdminAssign() {
  const { user } = useAuth();
  const [assignments,  setAssignments]  = useState<any>({});
  const [lockedStreams, setLocked]       = useState<any>({});
  const [extraPartners,setExtra]         = useState<any>({});
  const [dailyLogs,    setDailyLogs]    = useState<any>({});
  const [leads,        setLeads]         = useState<any>({});
  const [view,         setView]          = useState<"assign"|"summary">("assign");
  const [np,           setNp]            = useState({ name:"", color:"#8E44AD" });

  useEffect(() => {
    const u = [
      onValue(ref(db,"/assignments"),  s => setAssignments(s.val()||{})),
      onValue(ref(db,"/locked"),       s => setLocked(s.val()||{})),
      onValue(ref(db,"/extraPartners"),s => setExtra(s.val()||{})),
      onValue(ref(db,"/daily"),        s => setDailyLogs(s.val()||{})),
      onValue(ref(db,"/leads"),        s => setLeads(s.val()||{})),
    ];
    return () => u.forEach(x => x());
  }, []);

  const allPartners = [...BASE_PARTNERS, ...Object.values(extraPartners)];

  const getOwners = (sid: string) => {
    const a = assignments[sid];
    if (!a) return [];
    if (typeof a === "string") return allPartners.filter(p => p.id === a);
    return allPartners.filter((p: any) => a[p.id] === true);
  };

  const isShared = (sid: string) => {
    const a = assignments[sid];
    if (!a || typeof a === "string") return false;
    return Object.values(a).filter(Boolean).length > 1;
  };

  const toggleAssign = (streamId: string, partnerId: string) => {
    const cur = assignments[streamId];
    if (typeof cur === "string" && cur !== partnerId) {
      set(ref(db, `/assignments/${streamId}`), { [cur]: true, [partnerId]: true });
      return;
    }
    if (typeof cur === "string" && cur === partnerId) {
      set(ref(db, `/assignments/${streamId}`), null);
      return;
    }
    const checked = cur?.[partnerId] === true;
    set(ref(db, `/assignments/${streamId}/${partnerId}`), checked ? null : true);
  };

  const td = todayStr();
  const todayLog = dailyLogs[td] || {};
  const totalHC  = Object.values(todayLog).reduce((s: number, v: any) => s + (Number(v?.headcount)||0), 0);
  const pipeVal  = Object.values(leads).reduce((s: number, l: any) => s + (Number(l.value)||0), 0);
  const confVal  = Object.values(leads).filter((l: any) => l.status==="confirmed").reduce((s: number, l: any) => s + (Number(l.value)||0), 0);

  return (
    <div className="p-8" style={{ fontFamily:"ui-sans-serif,system-ui,sans-serif", color:C.dark }}>
      <h1 className="font-serif text-2xl font-bold text-brand-earth mb-1">⚙ Admin — Stream Control</h1>
      <p className="text-sm text-brand-muted mb-6">Assign streams to partners, lock editing, manage access.</p>

      {/* Sub tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${C.border}`, marginBottom:18 }}>
        {[["assign","🎯 Assign Streams"],["summary","📊 Today's Summary"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k as any)}
            style={{ padding:"8px 16px", fontSize:13, fontWeight:view===k?700:400, border:"none",
              borderBottom:view===k?`3px solid ${C.dark}`:"3px solid transparent",
              background:"transparent", color:view===k?C.dark:C.muted, cursor:"pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {view==="assign" && (
        <div>
          {/* Instructions */}
          <div style={{ background:"#fff", border:`1px solid ${C.border}`, padding:"11px 14px",
            marginBottom:14, fontSize:12.5, borderLeft:`4px solid ${C.dark}`, borderRadius:6 }}>
            <b>How to assign:</b> Tick the checkbox under a partner's name to give them access to that stream.
            Tick multiple partners for a <span style={{ background:"#FFF3CD", color:"#856404", padding:"0 5px", fontWeight:700 }}>SHARED</span> stream.
            🔒 locks editing for all partners.
          </div>

          {/* Assignment matrix */}
          <div style={{ background:"#fff", border:`1px solid ${C.border}`, overflow:"auto", marginBottom:16, borderRadius:8 }}>
            <table style={{ borderCollapse:"collapse", width:"100%", minWidth:480 }}>
              <thead>
                <tr style={{ background:C.dark, color:"#fff" }}>
                  <th style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600,
                    minWidth:170, position:"sticky", left:0, background:C.dark, zIndex:2 }}>Stream</th>
                  <th style={{ padding:"10px 6px", textAlign:"center", fontSize:11, fontWeight:600, minWidth:55 }}>Type</th>
                  {allPartners.map((p: any) => (
                    <th key={p.id} style={{ padding:"10px 10px", textAlign:"center", fontSize:11, fontWeight:600, minWidth:75 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                        <span style={{ fontSize:18 }}>{p.emoji||"👤"}</span>
                        <span style={{ fontSize:10, padding:"1px 7px", background:`${p.color}40`, color:"#fff", borderRadius:3 }}>{p.name}</span>
                      </div>
                    </th>
                  ))}
                  <th style={{ padding:"10px 8px", textAlign:"center", fontSize:11, fontWeight:600, minWidth:55 }}>Lock</th>
                </tr>
              </thead>
              <tbody>
                {ALL_STREAMS.map((s, idx) => {
                  const owners = getOwners(s.id);
                  const shared = isShared(s.id);
                  const locked = lockedStreams[s.id];
                  return (
                    <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}`, background:idx%2===0?"#fff":"#FAFAF7" }}>
                      <td style={{ padding:"10px 14px", position:"sticky", left:0, background:idx%2===0?"#fff":"#FAFAF7", zIndex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ width:9, height:9, borderRadius:"50%", background:STREAM_COLORS[s.id]||C.community, display:"inline-block", flexShrink:0 }}/>
                          <span style={{ fontSize:12.5, fontWeight:600 }}>{s.label}</span>
                        </div>
                        <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
                          {shared && <span style={{ fontSize:8.5, background:"#FFF3CD", color:"#856404", padding:"1px 5px", fontWeight:700 }}>SHARED</span>}
                          {s.fixed && <span style={{ fontSize:8.5, background:"#E8F5E9", color:C.community, padding:"1px 5px", fontWeight:700 }}>FIXED</span>}
                          {owners.map((o: any) => (
                            <span key={o.id} style={{ fontSize:9, padding:"1px 6px", fontWeight:700, background:`${o.color}20`, color:o.color, border:`1px solid ${o.color}50`, borderRadius:2 }}>
                              {o.emoji} {o.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding:"10px 6px", textAlign:"center" }}>
                        <span style={{ fontSize:10, padding:"2px 6px", background:s.type==="community"?`${C.community}15`:`${C.corporate}15`, color:s.type==="community"?C.community:C.corporate, fontWeight:600 }}>
                          {s.type==="community"?"COM":"CORP"}
                        </span>
                      </td>
                      {allPartners.map((p: any) => {
                        const a = assignments[s.id];
                        const checked = typeof a==="string" ? a===p.id : (a?.[p.id]===true);
                        return (
                          <td key={p.id} style={{ padding:"10px", textAlign:"center" }}>
                            <input type="checkbox" checked={!!checked}
                              onChange={() => toggleAssign(s.id, p.id)}
                              style={{ accentColor:p.color, width:18, height:18, cursor:"pointer" }}/>
                          </td>
                        );
                      })}
                      <td style={{ padding:"10px", textAlign:"center" }}>
                        <button onClick={() => update(ref(db,"/locked"),{[s.id]:!locked})}
                          style={{ fontSize:12, padding:"3px 8px", border:`1px solid ${locked?C.red:C.border}`,
                            background:locked?"#FFE0E0":"#fff", color:locked?C.red:C.muted, cursor:"pointer", borderRadius:4 }}>
                          {locked?"🔒":"🔓"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize:11, color:C.muted, marginBottom:18 }}>
            Changes apply instantly. Partners see updated access on next refresh.
          </p>

          {/* Add partner */}
          <div style={{ background:"#fff", border:`1px solid ${C.border}`, padding:"13px 15px", borderRadius:8 }}>
            <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.09em", color:C.muted, fontWeight:700, marginBottom:11 }}>
              Add a new revenue partner
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:9.5, color:C.muted, marginBottom:2 }}>Name</div>
                <input type="text" placeholder="e.g. Priya" value={np.name}
                  onChange={e=>setNp(p=>({...p,name:e.target.value}))}
                  style={{ width:150, border:`1px solid ${C.border}`, padding:"5px 8px", fontSize:13 }}/>
              </div>
              <div>
                <div style={{ fontSize:9.5, color:C.muted, marginBottom:2 }}>Colour</div>
                <input type="color" value={np.color}
                  onChange={e=>setNp(p=>({...p,color:e.target.value}))}
                  style={{ width:50, height:33, padding:2, border:`1px solid ${C.border}` }}/>
              </div>
              <button
                onClick={()=>{ if(!np.name.trim())return; const id=`partner_${Date.now()}`; update(ref(db,"/extraPartners"),{[id]:{id,name:np.name.trim(),color:np.color,light:np.color+"20",isAdmin:false,emoji:"👤"}}); setNp({name:"",color:"#8E44AD"}); }}
                style={{ padding:"6px 16px", background:C.dark, color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer", borderRadius:6 }}>
                + Add Partner
              </button>
            </div>
            {Object.values(extraPartners).length>0&&(
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {Object.entries(extraPartners).map(([id,p]: any)=>(
                  <div key={id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:`${p.color}15`, border:`1px solid ${p.color}50`, borderRadius:6 }}>
                    <span style={{ width:9, height:9, borderRadius:"50%", background:p.color, display:"inline-block" }}/>
                    <span style={{ fontSize:12.5, fontWeight:600, color:p.color }}>{p.name}</span>
                    <button onClick={()=>set(ref(db,`/extraPartners/${id}`),null)}
                      style={{ fontSize:10, color:C.red, border:"none", background:"transparent", padding:0, marginLeft:4, cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view==="summary" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:9, marginBottom:18 }}>
            {[
              ["Today's headcount", totalHC,        "across all sessions",          "#1E5C3A"],
              ["Pipeline value",    inr(pipeVal),   `${Object.keys(leads).length} total leads`, "#C17B2A"],
              ["Confirmed",         inr(confVal),   "marked confirmed",             "#1A2830"],
              ["Locked streams",    Object.values(lockedStreams).filter(Boolean).length, `of ${ALL_STREAMS.length} total`, "#C4322E"],
            ].map(([t,v,s,col]: any)=>(
              <div key={t} style={{ background:"#fff", border:`1px solid ${C.border}`, borderTop:`3px solid ${col}`, padding:"9px 11px", borderRadius:8 }}>
                <div style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.07em", color:C.muted }}>{t}</div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:"Georgia,serif" }}>{v}</div>
                <div style={{ fontSize:10.5, color:C.muted }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"#fff", border:`1px solid ${C.border}`, padding:"13px 15px", borderRadius:8 }}>
            <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.09em", color:C.muted, fontWeight:700, marginBottom:11 }}>
              Stream-by-stream — {td}
            </div>
            {ALL_STREAMS.filter(s=>!s.fixed).map(s=>{
              const entry = todayLog[s.id];
              const owners = getOwners(s.id);
              return(
                <div key={s.id} style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", padding:"7px 0", borderBottom:`1px dotted ${C.border}` }}>
                  <span style={{ flex:"1 1 130px", fontSize:12.5, fontWeight:600 }}>{s.label}</span>
                  <div style={{ display:"flex", gap:4 }}>
                    {owners.map((o: any)=>(
                      <span key={o.id} style={{ fontSize:9.5, padding:"1px 6px", fontWeight:700, background:`${o.color}20`, color:o.color, borderRadius:2 }}>{o.emoji} {o.name}</span>
                    ))}
                  </div>
                  {entry?(
                    <>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1E5C3A" }}>{entry.headcount||0} pax</span>
                      {entry.notes&&<span style={{ fontSize:11, color:C.muted }}>{entry.notes}</span>}
                      <span style={{ fontSize:10, color:C.muted }}>by {entry.by}</span>
                    </>
                  ):(
                    <span style={{ fontSize:11, color:"#CCC" }}>Not logged yet</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
