import React, { useState, useMemo, useEffect } from "react";
import { onValue, ref, update } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

const ALL_STREAMS = [
  { id:"kids",        label:"Kids Activity",             type:"community", unitLabel:"enrolled",            defaultCount:15, defaultPrice:2500  },
  { id:"yoga",        label:"Wellness / Yoga",           type:"community", unitLabel:"members",             defaultCount:25, defaultPrice:1500  },
  { id:"senior",      label:"Senior Citizen",            type:"community", unitLabel:"visits/month",        defaultCount:20, defaultPrice:100   },
  { id:"social",      label:"Evening Social",            type:"community", unitLabel:"walk-ins/month",      defaultCount:40, defaultPrice:300   },
  { id:"events_in",   label:"Ticketed Events (TLR)",     type:"community", unitLabel:"avg attendees/event", defaultCount:35, defaultPrice:600,  defaultEventsPerMonth:2, isEventStream:true },
  { id:"members",     label:"Membership",                type:"community", unitLabel:"members",             defaultCount:10, defaultPrice:2000  },
  { id:"coffee_shop", label:"Coffee Shop Collaborator",  type:"community", unitLabel:"fixed/month",         defaultCount:1,  defaultPrice:25000, fixed:true },
  { id:"offsite",     label:"Corporate Off-sites",       type:"corporate", unitLabel:"bookings/month",      defaultCount:3,  defaultPrice:15000 },
  { id:"workshop",    label:"Workshop / Room Rental",    type:"corporate", unitLabel:"bookings/month",      defaultCount:3,  defaultPrice:6000  },
  { id:"events_out",  label:"Events Outside TLR",        type:"corporate", unitLabel:"avg attendees/event", defaultCount:35, defaultPrice:500,  defaultEventsPerMonth:1, isEventStream:true },
];

const C = { community:"#1E5C3A", corporate:"#C17B2A", red:"#C4322E", border:"#DDD9D0", muted:"#7A8690" };
const inr = (v: number) => "₹" + Math.round(Math.abs(v)).toLocaleString("en-IN");
const lakh = (v: number) => { const s=v<0?"−":""; return s+"₹"+(Math.abs(v)/100000).toFixed(2)+"L"; };

export default function PartnerRevenue() {
  const { user, isAdmin } = useAuth();
  const [streamData, setStreamData]   = useState<any>({});
  const [assignments, setAssignments] = useState<any>({});
  const [miscStreams, setMiscStreams]  = useState<any>({});
  const [lockedStreams, setLocked]    = useState<any>({});
  const [opsTarget, setOpsTarget]     = useState(200000);
  const [newMisc, setNewMisc]         = useState({ label:"", amount:"" });

  useEffect(() => {
    const unsubs = [
      onValue(ref(db, "/streams"),      s => setStreamData(s.val() || {})),
      onValue(ref(db, "/assignments"),  s => setAssignments(s.val() || {})),
      onValue(ref(db, "/miscStreams"),  s => setMiscStreams(s.val() || {})),
      onValue(ref(db, "/locked"),       s => setLocked(s.val() || {})),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const getOwners = (sid: string) => {
    const a = assignments[sid];
    if (!a) return [];
    if (typeof a === "string") return [a];
    return Object.keys(a).filter(k => a[k] === true);
  };
  const canEdit = (sid: string) => {
    if (isAdmin) return true;
    if (lockedStreams[sid]) return false;
    const owners = getOwners(sid);
    if (owners.length === 0) return true;
    return owners.includes(user?.partnerId || "");
  };
  const getV = (id: string, f: string) => {
    const def: any = ALL_STREAMS.find(s => s.id === id);
    if (f === "count") return streamData[id]?.count ?? def?.defaultCount ?? 0;
    if (f === "price") return streamData[id]?.price ?? def?.defaultPrice ?? 0;
    if (f === "epm")   return streamData[id]?.eventsPerMonth ?? def?.defaultEventsPerMonth ?? 1;
    return streamData[id]?.[f];
  };
  const getRevenue = (s: any) => {
    const active = streamData[s.id]?.active !== false;
    if (!active) return 0;
    if (s.fixed) return getV(s.id, "price");
    if (s.isEventStream) return getV(s.id, "epm") * getV(s.id, "count") * getV(s.id, "price");
    return getV(s.id, "count") * getV(s.id, "price");
  };
  const miscTotal = Object.values(miscStreams as any).reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0) as number;
  const calc = useMemo(() => {
    const cr = ALL_STREAMS.filter(s=>s.type==="community").reduce((s,x)=>s+getRevenue(x),0)+(miscTotal as number);
    const ko = ALL_STREAMS.filter(s=>s.type==="corporate").reduce((s,x)=>s+getRevenue(x),0);
    const total = cr + ko;
    return { commRev:cr, corpRev:ko, total, surplus:total-opsTarget, commPct:total>0?cr/total*100:0 };
  }, [streamData, opsTarget, miscTotal]);
  const ok = calc.surplus >= 0;

  const fbUpd = (path: string, val: any) => update(ref(db, path), val);

  return (
    <div className="p-6" style={{ fontFamily:"ui-sans-serif,system-ui,sans-serif", color:"#1A2830" }}>
      {/* Status bar */}
      <div style={{ background:ok?"#1E5C3A":"#C4322E", color:"#fff", padding:"11px 16px", marginBottom:14, display:"flex", flexWrap:"wrap" as const, gap:14, alignItems:"center", borderRadius:8 }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
          {ok?"+":"−"}{inr(Math.abs(calc.surplus))} {ok?"above":"below"} target
        </div>
        <div style={{ fontSize:12.5, opacity:0.9 }}>Community: <b>{inr(calc.commRev)}</b> · Corporate: <b>{inr(calc.corpRev)}</b> · Total: <b>{inr(calc.total)}</b></div>
        {isAdmin && (
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:7, fontSize:12 }}>
            Ops target ₹:
            <input type="number" value={opsTarget} step={10000} onChange={e=>setOpsTarget(Number(e.target.value))}
              style={{ width:100, border:"1px solid rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.1)", color:"#fff", padding:"4px 8px", fontSize:13 }} />
          </div>
        )}
      </div>

      {/* Split bar */}
      <div style={{ height:5, display:"flex", marginBottom:14, borderRadius:4, overflow:"hidden" }}>
        <div style={{ width:`${calc.commPct}%`, background:C.community }} />
        <div style={{ flex:1, background:C.corporate }} />
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:9, marginBottom:16 }}>
        {[
          ["Community (75%)", calc.commRev, `target ${lakh(opsTarget*0.75)}`, C.community],
          ["Corporate (25%)", calc.corpRev, `target ${lakh(opsTarget*0.25)}`, C.corporate],
          ["Monthly total",   calc.total,   `${Math.round(calc.total/opsTarget*100)}% of target`, ok?C.community:C.red],
          ["Annual run-rate", calc.total*12,"if sustained","#1A2830"],
        ].map(([t,v,s,col]: any) => (
          <div key={t} style={{ background:"#fff", border:`1px solid ${C.border}`, borderTop:`3px solid ${col}`, padding:"9px 11px", borderRadius:8 }}>
            <div style={{ fontSize:10, textTransform:"uppercase" as const, letterSpacing:"0.07em", color:C.muted }}>{t}</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"Georgia,serif", fontVariantNumeric:"tabular-nums" }}>{inr(v)}</div>
            <div style={{ fontSize:10.5, color:C.muted }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Stream tables */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {(["community","corporate"] as const).map(type => (
          <div key={type} style={{ background:"#fff", border:`1px solid ${C.border}`, borderTop:`4px solid ${type==="community"?C.community:C.corporate}`, borderRadius:8, overflow:"hidden" }}>
            <div style={{ padding:"9px 13px 6px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:9.5, textTransform:"uppercase" as const, letterSpacing:"0.08em", color:type==="community"?C.community:C.corporate, fontWeight:700 }}>
                {type === "community" ? "Community Streams" : "Corporate Streams"}
              </div>
              <div style={{ fontSize:16, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
                {inr(type==="community"?calc.commRev:calc.corpRev)}
              </div>
            </div>
            {ALL_STREAMS.filter(s=>s.type===type).map(s => {
              const editable = canEdit(s.id);
              const active   = streamData[s.id]?.active !== false;
              const rev      = getRevenue(s);
              const owners   = getOwners(s.id);
              const isMine   = owners.includes(user?.partnerId||"") || owners.length===0;
              return (
                <div key={s.id} style={{ borderBottom:`1px solid ${C.border}`, padding:"8px 13px", background:isMine?"rgba(30,92,58,0.04)":"transparent", borderLeft:isMine?`4px solid ${C.community}`:"4px solid transparent", opacity:active?1:0.5 }}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600 }}>{s.label}</div>
                      {s.isEventStream && (
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, fontSize:10.5, color:C.muted }}>
                          Events/mo:
                          <input type="number" value={getV(s.id,"epm")} min={0} step={1} disabled={!editable}
                            onChange={e=>fbUpd(`/streams/${s.id}`,{eventsPerMonth:Number(e.target.value)})}
                            style={{ width:46, fontSize:12, border:`1px solid ${C.border}`, padding:"2px 5px", opacity:editable?1:0.6 }} />
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0, flexWrap:"wrap" as const }}>
                      {!s.fixed && !s.isEventStream && (
                        <>
                          <input type="number" value={getV(s.id,"count")} min={0} step={1} disabled={!editable} onChange={e=>fbUpd(`/streams/${s.id}`,{count:Number(e.target.value)})} style={{ width:60, border:`1px solid ${C.border}`, padding:"3px 5px", fontSize:12, opacity:editable?1:0.6, fontVariantNumeric:"tabular-nums" }} />
                          <span style={{ fontSize:10, color:C.muted }}>×₹</span>
                          <input type="number" value={getV(s.id,"price")} min={0} step={100} disabled={!editable} onChange={e=>fbUpd(`/streams/${s.id}`,{price:Number(e.target.value)})} style={{ width:68, border:`1px solid ${C.border}`, padding:"3px 5px", fontSize:12, opacity:editable?1:0.6, fontVariantNumeric:"tabular-nums" }} />
                        </>
                      )}
                      {s.fixed && <span style={{ fontSize:11, color:C.muted }}>Fixed:</span>}
                      {s.isEventStream && (
                        <>
                          <input type="number" value={getV(s.id,"count")} min={0} step={1} disabled={!editable} onChange={e=>fbUpd(`/streams/${s.id}`,{count:Number(e.target.value)})} style={{ width:56, border:`1px solid ${C.border}`, padding:"3px 5px", fontSize:12, opacity:editable?1:0.6, fontVariantNumeric:"tabular-nums" }} />
                          <span style={{ fontSize:10, color:C.muted }}>pax×₹</span>
                          <input type="number" value={getV(s.id,"price")} min={0} step={50} disabled={!editable} onChange={e=>fbUpd(`/streams/${s.id}`,{price:Number(e.target.value)})} style={{ width:62, border:`1px solid ${C.border}`, padding:"3px 5px", fontSize:12, opacity:editable?1:0.6, fontVariantNumeric:"tabular-nums" }} />
                        </>
                      )}
                      {(s.fixed) && isAdmin && (
                        <input type="number" value={getV(s.id,"price")} min={0} step={1000} onChange={e=>fbUpd(`/streams/${s.id}`,{price:Number(e.target.value)})} style={{ width:90, border:`1px solid ${C.border}`, padding:"3px 5px", fontSize:12, fontVariantNumeric:"tabular-nums" }} />
                      )}
                      <div style={{ width:70, textAlign:"right", fontSize:13, fontWeight:700, color:type==="community"?C.community:C.corporate, fontVariantNumeric:"tabular-nums" }}>{inr(rev)}</div>
                      {(isAdmin||isMine)&&!s.fixed&&(
                        <button onClick={()=>fbUpd(`/streams/${s.id}`,{active:streamData[s.id]?.active===false})}
                          style={{ fontSize:10, padding:"3px 7px", border:`1px solid ${C.border}`, background:active?(type==="community"?C.community:C.corporate):"#fff", color:active?"#fff":C.muted, cursor:"pointer" }}>
                          {active?"ON":"OFF"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop:4, height:3, background:"#EEE", borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${Math.min(100,rev/(opsTarget/ALL_STREAMS.length)*100)}%`, background:type==="community"?C.community:C.corporate, borderRadius:2, transition:"width 0.2s" }} />
                  </div>
                </div>
              );
            })}
            {type === "community" && (
              <div style={{ background:"#F7F4ED", borderTop:`1px dashed ${C.border}`, padding:"8px 13px" }}>
                <div style={{ fontSize:10, textTransform:"uppercase" as const, letterSpacing:"0.08em", color:C.muted, fontWeight:700, marginBottom:6 }}>Misc Revenue</div>
                {Object.entries(miscStreams as any).map(([id,m]: any) => (
                  <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom:`1px dotted ${C.border}` }}>
                    <span style={{ fontSize:12.5 }}>{m.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:C.community, fontVariantNumeric:"tabular-nums" }}>₹{Number(m.amount).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" as const }}>
                  <input type="text" placeholder="Stream name" value={newMisc.label} onChange={e=>setNewMisc(p=>({...p,label:e.target.value}))} style={{ flex:"1 1 100px", border:`1px solid ${C.border}`, padding:"5px 8px", fontSize:12 }} />
                  <input type="number" placeholder="₹/month" value={newMisc.amount} onChange={e=>setNewMisc(p=>({...p,amount:e.target.value}))} style={{ width:90, border:`1px solid ${C.border}`, padding:"5px 8px", fontSize:12 }} />
                  <button onClick={()=>{ if(!newMisc.label||!newMisc.amount)return; const id=`misc_${Date.now()}`; update(ref(db,`/miscStreams/${id}`),{...newMisc,addedBy:user?.name}); setNewMisc({label:"",amount:""}); }} style={{ padding:"5px 12px", background:C.community, color:"#fff", border:"none", fontSize:12, fontWeight:600, cursor:"pointer" }}>+ Add</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
