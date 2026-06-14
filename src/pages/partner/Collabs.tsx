import React, { useState, useEffect } from "react";
import { onValue, ref, update, set } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

const ALL_STREAMS = [
  {id:"kids",label:"Kids Activity"},{id:"yoga",label:"Wellness/Yoga"},{id:"senior",label:"Senior Citizen"},
  {id:"social",label:"Evening Social"},{id:"events_in",label:"Ticketed Events(TLR)"},{id:"members",label:"Membership"},
  {id:"coffee_shop",label:"Coffee Shop Collaborator",fixed:true},
  {id:"offsite",label:"Corporate Off-sites"},{id:"workshop",label:"Workshop/Rental"},{id:"events_out",label:"Events Outside TLR"},
];
const PARTNER_COLORS: Record<string,string> = {nitin:"#1A2830",shruthi:"#C0392B",siva:"#2471A3",anusha:"#1E8449"};
const C = {border:"#DDD9D0",muted:"#7A8690",dark:"#1A2830",green:"#1E5C3A",red:"#C4322E"};

export default function PartnerCollabs() {
  const {user,isAdmin} = useAuth();
  const [collaborators,setCollabs] = useState<any>({});
  const [assignments,setAssign]    = useState<any>({});
  const [nc,setNc]                 = useState<any>({});

  useEffect(()=>{
    const u=[
      onValue(ref(db,"/collaborators"),s=>setCollabs(s.val()||{})),
      onValue(ref(db,"/assignments"),  s=>setAssign(s.val()||{})),
    ];
    return()=>u.forEach(x=>x());
  },[]);

  const getOwnerIds=(sid: string)=>{const a=assignments[sid];if(!a)return[];if(typeof a==="string")return[a];return Object.keys(a).filter(k=>a[k]===true);};
  const isMineStream=(sid: string)=>isAdmin||getOwnerIds(sid).includes(user?.partnerId||"");

  return(
    <div className="p-6" style={{fontFamily:"ui-sans-serif,system-ui,sans-serif",color:C.dark}}>
      <div style={{marginBottom:16}}>
        <h2 style={{fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 4px"}}>Activity Collaborators</h2>
        <p style={{fontSize:13,color:C.muted,margin:0}}>Add collaborators per activity — % of revenue or flat ₹ per session.</p>
      </div>
      {ALL_STREAMS.map(s=>{
        const ownerIds=getOwnerIds(s.id);
        const isMine=isMineStream(s.id);
        const editable=isAdmin||isMine;
        const sC=collaborators[s.id]||{};
        const n=nc[s.id]||{name:"",role:"",shareType:"percent",shareValue:""};
        const ownerColor=ownerIds.length>0?(PARTNER_COLORS[ownerIds[0]]||C.dark):C.border;
        return(
          <div key={s.id} style={{background:"#fff",border:`1px solid ${C.border}`,marginBottom:11,borderLeft:isMine?`4px solid ${PARTNER_COLORS[user?.partnerId||""]||C.green}`:`4px solid ${ownerColor}`,borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"9px 13px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:700}}>{s.label}</span>
                {(s as any).fixed&&<span style={{fontSize:9.5,background:"#E8F5E9",color:C.green,padding:"1px 5px",fontWeight:700}}>FIXED</span>}
                {ownerIds.length>1&&<span style={{fontSize:9,background:"#FFF3CD",color:"#856404",padding:"1px 5px",fontWeight:700}}>SHARED</span>}
                {ownerIds.map(pid=>(
                  <span key={pid} style={{fontSize:9.5,padding:"1px 6px",fontWeight:700,background:`${PARTNER_COLORS[pid]||C.dark}20`,color:PARTNER_COLORS[pid]||C.dark,border:`1px solid ${PARTNER_COLORS[pid]||C.dark}50`,borderRadius:2}}>{pid}</span>
                ))}
                {isMine&&<span style={{fontSize:9.5,padding:"1px 6px",background:`${PARTNER_COLORS[user?.partnerId||""]||C.green}20`,color:PARTNER_COLORS[user?.partnerId||""]||C.green,fontWeight:700,borderRadius:2}}>Your stream</span>}
              </div>
              <span style={{fontSize:11,color:C.muted}}>{Object.keys(sC).length} collaborator(s)</span>
            </div>
            {Object.entries(sC).map(([cid,c]: any)=>(
              <div key={cid} style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"center",padding:"7px 13px",borderBottom:`1px dotted ${C.border}`}}>
                <span style={{flex:"1 1 110px",fontSize:13,fontWeight:600}}>{c.name}</span>
                <span style={{fontSize:11.5,color:C.muted}}>{c.role}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.green}}>{c.shareType==="percent"?`${c.shareValue}% of revenue`:`₹${Number(c.shareValue).toLocaleString("en-IN")} /session`}</span>
                <span style={{fontSize:10,color:C.muted}}>by {c.addedBy}</span>
                {editable&&<button onClick={()=>set(ref(db,`/collaborators/${s.id}/${cid}`),null)} style={{fontSize:10,padding:"2px 6px",color:C.red,border:`1px solid ${C.red}`,background:"#fff",cursor:"pointer"}}>✕</button>}
              </div>
            ))}
            {editable&&(
              <div style={{padding:"9px 13px",background:"#FAFAF7",display:"flex",flexWrap:"wrap",gap:6,alignItems:"flex-end"}}>
                <div>
                  <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Name</div>
                  <input type="text" placeholder="Collaborator" value={n.name} onChange={e=>setNc((p: any)=>({...p,[s.id]:{...n,name:e.target.value}}))} style={{width:130,border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:12}}/>
                </div>
                <div>
                  <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Role</div>
                  <input type="text" placeholder="e.g. Instructor" value={n.role} onChange={e=>setNc((p: any)=>({...p,[s.id]:{...n,role:e.target.value}}))} style={{width:110,border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:12}}/>
                </div>
                <div>
                  <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Share type</div>
                  <select value={n.shareType} onChange={e=>setNc((p: any)=>({...p,[s.id]:{...n,shareType:e.target.value}}))} style={{height:32,border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:12}}>
                    <option value="percent">% of revenue</option>
                    <option value="flat">₹ per session</option>
                  </select>
                </div>
                <div>
                  <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>{n.shareType==="percent"?"%":"₹"}</div>
                  <input type="number" placeholder={n.shareType==="percent"?"40":"500"} value={n.shareValue} onChange={e=>setNc((p: any)=>({...p,[s.id]:{...n,shareValue:e.target.value}}))} style={{width:80,border:`1px solid ${C.border}`,padding:"5px 8px",fontSize:12}}/>
                </div>
                <button onClick={()=>{if(!n.name||!n.shareValue)return;const cid=`c_${Date.now()}`;update(ref(db,`/collaborators/${s.id}/${cid}`),{...n,addedBy:user?.name,addedById:user?.uid});setNc((p: any)=>({...p,[s.id]:{name:"",role:"",shareType:"percent",shareValue:""}}));}}
                  style={{padding:"5px 12px",background:C.dark,color:"#fff",border:"none",fontSize:12.5,fontWeight:600,cursor:"pointer",borderRadius:6}}>+ Add</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
