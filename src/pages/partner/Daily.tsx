import React, { useState, useEffect } from "react";
import { onValue, ref, update, set, push } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

const ALL_STREAMS = [
  {id:"kids",label:"Kids Activity"},{id:"yoga",label:"Wellness/Yoga"},{id:"senior",label:"Senior Citizen"},
  {id:"social",label:"Evening Social"},{id:"events_in",label:"Ticketed Events(TLR)"},{id:"members",label:"Membership"},
  {id:"offsite",label:"Corporate Off-sites"},{id:"workshop",label:"Workshop/Rental"},{id:"events_out",label:"Events Outside TLR"},
];
const STATUSES   = ["prospect","proposal sent","site visit","follow-up","confirmed","lost"];
const ST_COLORS: Record<string,string> = {
  "prospect":"#FFF9C4","proposal sent":"#BBDEFB","site visit":"#E1BEE7",
  "follow-up":"#FFCCBC","confirmed":"#C8E6C9","lost":"#FFCDD2",
};
const C = {border:"#DDD9D0",muted:"#7A8690",dark:"#1A2830",green:"#1E5C3A",red:"#C4322E"};
const todayStr = () => new Date().toISOString().split("T")[0];
const inr = (v: number) => "₹"+Math.round(v).toLocaleString("en-IN");

export default function PartnerDaily() {
  const {user,isAdmin} = useAuth();
  const [date,setDate]         = useState(todayStr());
  const [dailyLogs,setDL]      = useState<any>({});
  const [assignments,setAssign]= useState<any>({});
  const [leads,setLeads]        = useState<any>({});
  const [nl,setNl]             = useState({company:"",status:"prospect",value:"",notes:""});

  useEffect(()=>{
    const u=[
      onValue(ref(db,"/daily"),      s=>setDL(s.val()||{})),
      onValue(ref(db,"/assignments"),s=>setAssign(s.val()||{})),
      onValue(ref(db,"/leads"),      s=>setLeads(s.val()||{})),
    ];
    return()=>u.forEach(x=>x());
  },[]);

  const todayLog = dailyLogs[date]||{};
  const getOwnerIds=(sid: string)=>{const a=assignments[sid];if(!a)return[];if(typeof a==="string")return[a];return Object.keys(a).filter(k=>a[k]===true);};
  const canEdit=(sid: string)=>{if(isAdmin)return true;const o=getOwnerIds(sid);return o.length===0||o.includes(user?.partnerId||"");};
  const myStreams=ALL_STREAMS.filter(s=>{if(isAdmin)return true;const o=getOwnerIds(s.id);return o.length===0||o.includes(user?.partnerId||"");});

  const addLead=()=>{
    if(!nl.company)return;
    push(ref(db,"/leads"),{...nl,addedBy:user?.name,addedById:user?.uid,date:todayStr()});
    setNl({company:"",status:"prospect",value:"",notes:""});
  };

  return (
    <div className="p-6" style={{fontFamily:"ui-sans-serif,system-ui,sans-serif",color:C.dark}}>
      {/* Date picker */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,flexWrap:"wrap"}}>
        <h2 style={{fontFamily:"Georgia,serif",fontSize:18,margin:0}}>Daily Log</h2>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{fontSize:13,border:`1px solid ${C.border}`,padding:"5px 8px"}}/>
        <span style={{fontSize:12,color:C.muted}}>{date===todayStr()?"📅 Today":"📆 Past entry"}</span>
      </div>

      {/* Headcount grid */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,marginBottom:18,padding:"13px 15px",borderRadius:8}}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.09em",color:C.muted,fontWeight:700,marginBottom:11}}>Session headcount — {date}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:9}}>
          {myStreams.map(s=>{
            const entry=todayLog[s.id]||{};
            const editable=canEdit(s.id);
            return(
              <div key={s.id} style={{border:`1px solid ${C.border}`,padding:"9px 11px",borderLeft:`4px solid ${editable?"#1E5C3A":"#DDD"}`,borderRadius:6}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>{s.label}</div>
                <div style={{display:"flex",gap:7}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Headcount</div>
                    <input type="number" value={entry.headcount||""} min={0} placeholder="0" disabled={!editable}
                      onChange={e=>update(ref(db,`/daily/${date}/${s.id}`),{...entry,headcount:Number(e.target.value),by:user?.name})}
                      style={{width:"100%",fontSize:14,fontWeight:700,border:`1px solid ${C.border}`,padding:"4px 6px",opacity:editable?1:0.6}}/>
                  </div>
                  <div style={{flex:2}}>
                    <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Notes</div>
                    <input type="text" value={entry.notes||""} placeholder="Notes…" disabled={!editable}
                      onChange={e=>update(ref(db,`/daily/${date}/${s.id}`),{...entry,notes:e.target.value,by:user?.name})}
                      style={{width:"100%",border:`1px solid ${C.border}`,padding:"4px 6px",fontSize:12,opacity:editable?1:0.6}}/>
                  </div>
                </div>
                {entry.by&&<div style={{fontSize:9,color:C.muted,marginTop:4}}>Updated by {entry.by}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leads pipeline */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,padding:"13px 15px",borderRadius:8}}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.09em",color:C.muted,fontWeight:700,marginBottom:11}}>Corporate Leads Pipeline</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:13,padding:"9px 11px",background:"#F7F4ED",border:`1px solid ${C.border}`,borderRadius:6}}>
          <input type="text" placeholder="Company" value={nl.company} onChange={e=>setNl(p=>({...p,company:e.target.value}))} style={{flex:"1 1 120px",border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:13}}/>
          <select value={nl.status} onChange={e=>setNl(p=>({...p,status:e.target.value}))} style={{flex:"0 1 130px",border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:13}}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <input type="number" placeholder="Est ₹ value" value={nl.value} onChange={e=>setNl(p=>({...p,value:e.target.value}))} style={{flex:"0 1 110px",border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:13}}/>
          <input type="text" placeholder="Notes" value={nl.notes} onChange={e=>setNl(p=>({...p,notes:e.target.value}))} style={{flex:"1 1 120px",border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:13}}/>
          <button onClick={addLead} style={{padding:"5px 14px",background:C.dark,color:"#fff",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",borderRadius:6}}>+ Add</button>
        </div>
        {Object.keys(leads).length===0?(
          <div style={{color:C.muted,fontSize:13,padding:"8px 0"}}>No leads yet.</div>
        ):(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
              <thead><tr style={{background:"#F7F4ED"}}>
                {["Company","Status","Est. Value","Added by","Notes",""].map(h=>(
                  <th key={h} style={{padding:"6px 9px",textAlign:"left",fontSize:10,fontWeight:600,color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {Object.entries(leads).map(([id,lead]: any)=>{
                  const canEditLead=isAdmin||lead.addedById===user?.uid;
                  return(
                    <tr key={id} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:"7px 9px",fontWeight:600}}>{lead.company}</td>
                      <td style={{padding:"7px 9px"}}>
                        {canEditLead?(
                          <select value={lead.status} onChange={e=>update(ref(db,`/leads/${id}`),{...lead,status:e.target.value})}
                            style={{fontSize:11.5,background:ST_COLORS[lead.status]||"#fff",border:"1px solid #ddd",padding:"2px 6px"}}>
                            {STATUSES.map(s=><option key={s}>{s}</option>)}
                          </select>
                        ):(
                          <span style={{padding:"2px 7px",fontSize:11,background:ST_COLORS[lead.status]||"#F7F4ED"}}>{lead.status}</span>
                        )}
                      </td>
                      <td style={{padding:"7px 9px",fontVariantNumeric:"tabular-nums"}}>{lead.value?inr(Number(lead.value)):"—"}</td>
                      <td style={{padding:"7px 9px",fontSize:11,color:C.muted}}>{lead.addedBy}</td>
                      <td style={{padding:"7px 9px",color:C.muted,fontSize:11.5}}>{lead.notes}</td>
                      <td style={{padding:"7px 9px"}}>
                        {canEditLead&&<button onClick={()=>set(ref(db,`/leads/${id}`),null)} style={{fontSize:10,padding:"2px 6px",color:C.red,border:`1px solid ${C.red}`,background:"#fff",cursor:"pointer"}}>✕</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
