import React, { useState, useEffect, useMemo } from "react";
import { onValue, ref, set, update } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

const SLOTS      = ["7–9 AM","10 AM–12 PM","2–5 PM","6–10 PM"];
const SLOT_NAMES = ["Early morning","Mid-morning","Afternoon","Evening"];
const DAYS       = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const SC: Record<string,{label:string;color:string}> = {
  kids:      {label:"Kids",        color:"#D4790A"},
  yoga:      {label:"Yoga",        color:"#1E6B40"},
  senior:    {label:"Senior",      color:"#2E8B57"},
  social:    {label:"Social",      color:"#27AE60"},
  events_in: {label:"Events(TLR)",color:"#2471A3"},
  members:   {label:"Members",     color:"#7D3C98"},
  offsite:   {label:"Corporate",   color:"#B7770D"},
  workshop:  {label:"Workshop",    color:"#C67C1A"},
  events_out:{label:"Events(Out)", color:"#1A5276"},
};

const STREAM_LIST = Object.entries(SC).map(([id,s])=>({id,...s}));

const RUNGS = [
  {id:1,title:"Open with 2 streams",week:"Week 1",color:"#1E6B40",projRev:15000,
   streams:["yoga"],
   unlock:["Instructor confirmed","Payment link live","Floor anchor present daily","Google Business Profile live","5+ Yoga attendees by end of week"]},
  {id:2,title:"Fill the day",week:"Week 2",color:"#1A7A52",projRev:42000,
   streams:["yoga","senior","social"],
   unlock:["5+ consistent Yoga attendees","RWA/trust partnership confirmed","UPI QR at entrance","Instagram: first 5 photos","Social: 10+ confirmations"]},
  {id:3,title:"Add Kids + corporate",week:"Weeks 3–4",color:"#C17B2A",projRev:95000,
   streams:["yoga","senior","social","kids","offsite"],
   unlock:["8 Kids enrolled + advance paid","Child-safe check done","1 corporate booking + 50% advance","Free site visit for 2+ companies"]},
  {id:4,title:"Convert + workshop",week:"Month 2",color:"#7D3C98",projRev:170000,
   streams:["yoga","senior","social","kids","offsite","members","workshop"],
   unlock:["10+ regulars from Month 1","Membership pitched to 3+ session attendees","2 external workshop hosts confirmed","3 corporate bookings in Month 1","First ticketed event: 20+ pre-sold"]},
  {id:5,title:"Full program",week:"Month 3",color:"#2471A3",projRev:265000,
   streams:["yoga","senior","social","kids","offsite","members","workshop","events_in","events_out"],
   unlock:["Calendar >60% in Month 2","15+ members active","1 corporate retainer signed","Ticketed event proven with 25+ pax","Events outside TLR: ROI confirmed"]},
];

const get14Days = () => {
  const a=[]; const t=new Date();
  for(let i=0;i<14;i++){const d=new Date(t);d.setDate(t.getDate()+i);a.push(d.toISOString().split("T")[0]);}
  return a;
};
const fmtDate = (ds: string) => {
  const d=new Date(ds+"T00:00:00");
  return {day:d.toLocaleDateString("en-IN",{weekday:"short"}),num:d.getDate(),isWknd:d.getDay()===0||d.getDay()===6};
};

const C = {border:"#DDD9D0",muted:"#7A8690",dark:"#1A2830",bg:"#F7F4ED"};
const inr = (v: number) => "₹"+(v/100000).toFixed(1)+"L";

export default function PartnerCalendar() {
  const { user, isAdmin } = useAuth();
  const [subTab, setSubTab]       = useState<"ladder"|"pipeline"|"compare">("ladder");
  const [checklist, setChecklist] = useState<any>({});
  const [pipeline, setPipeline]   = useState<any>({});
  const [assignments, setAssign]  = useState<any>({});
  const [streamData, setSD]       = useState<any>({});
  const [selRung, setSelRung]     = useState(0);

  useEffect(() => {
    const u = [
      onValue(ref(db,"/checklist"),  s=>setChecklist(s.val()||{})),
      onValue(ref(db,"/pipeline"),   s=>setPipeline(s.val()||{})),
      onValue(ref(db,"/assignments"),s=>setAssign(s.val()||{})),
      onValue(ref(db,"/streams"),    s=>setSD(s.val()||{})),
    ];
    return ()=>u.forEach(x=>x());
  },[]);

  const getOwnerIds = (sid: string) => {
    const a=assignments[sid]; if(!a)return[];
    if(typeof a==="string")return[a];
    return Object.keys(a).filter(k=>a[k]===true);
  };
  const myStreams = STREAM_LIST.filter(s=>{
    if(isAdmin)return true;
    const owners=getOwnerIds(s.id);
    return owners.length===0||owners.includes(user?.partnerId||"");
  });

  const toggleCheck=(rungId:number,idx:number)=>{
    const cur=checklist[`r${rungId}`]?.[idx];
    set(ref(db,`/checklist/r${rungId}/${idx}`),!cur);
  };

  return (
    <div className="p-6" style={{fontFamily:"ui-sans-serif,system-ui,sans-serif",color:C.dark}}>
      {/* Sub tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`2px solid ${C.border}`,marginBottom:18}}>
        {(["ladder","pipeline","compare"] as const).map(t=>(
          <button key={t} onClick={()=>setSubTab(t)}
            style={{padding:"9px 18px",fontSize:13,fontWeight:subTab===t?700:400,border:"none",
              borderBottom:subTab===t?`3px solid ${C.dark}`:"3px solid transparent",
              background:"transparent",color:subTab===t?C.dark:C.muted,cursor:"pointer",textTransform:"capitalize"}}>
            {t==="ladder"?"Rung Ladder":t==="pipeline"?"2-Week Pipeline":"Plan vs Pipeline"}
          </button>
        ))}
      </div>

      {subTab==="ladder" && (
        <LadderView rungs={RUNGS} selRung={selRung} setSelRung={setSelRung} checklist={checklist} toggleCheck={toggleCheck} />
      )}
      {subTab==="pipeline" && (
        <PipelineView pipeline={pipeline} myStreams={myStreams} partnerId={user?.partnerId||""} isAdmin={isAdmin} getOwnerIds={getOwnerIds} />
      )}
      {subTab==="compare" && (
        <CompareView pipeline={pipeline} streamData={streamData} />
      )}
    </div>
  );
}

function LadderView({rungs,selRung,setSelRung,checklist,toggleCheck}: any) {
  const rung = rungs[selRung];
  const C2 = {border:"#DDD9D0",muted:"#7A8690",dark:"#1A2830"};
  return (
    <div style={{display:"grid",gridTemplateColumns:"220px 1fr",background:"#fff",border:`1px solid ${C2.border}`,borderRadius:8,overflow:"hidden",minHeight:500}}>
      <div style={{borderRight:`2px solid ${C2.border}`}}>
        {rungs.map((r: any,i: number)=>{
          const active=selRung===i;
          const done=Object.values(checklist[`r${r.id}`]||{}).filter(Boolean).length;
          return(
            <button key={r.id} onClick={()=>setSelRung(i)} style={{width:"100%",padding:"12px 14px",textAlign:"left",border:"none",borderBottom:`1px solid ${C2.border}`,borderLeft:active?`5px solid ${r.color}`:"5px solid transparent",background:active?r.color:"transparent",color:active?"#fff":C2.dark,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:active?"rgba(255,255,255,0.25)":r.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{r.id}</div>
                <div><div style={{fontSize:12,fontWeight:700}}>{r.title}</div><div style={{fontSize:9.5,opacity:0.75}}>{r.week}</div></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:10}}>
                <span style={{opacity:0.7}}>Run-rate</span>
                <span style={{fontWeight:700}}>{inr(r.projRev)}</span>
              </div>
              <div style={{height:3,background:active?"rgba(255,255,255,0.2)":"#EEE",borderRadius:2,marginTop:3}}>
                <div style={{height:"100%",width:`${Math.min(100,r.projRev/200000*100)}%`,background:active?"#fff":r.color,borderRadius:2}}/>
              </div>
              <div style={{fontSize:9,opacity:0.65,marginTop:2}}>{done}/{r.unlock.length} unlocks done</div>
            </button>
          );
        })}
      </div>
      <div style={{padding:18,overflowY:"auto"}}>
        <div style={{background:rung.color,color:"#fff",padding:"11px 15px",marginBottom:14,borderRadius:8}}>
          <div style={{fontSize:9.5,opacity:0.8,textTransform:"uppercase",letterSpacing:"0.1em"}}>{rung.week}</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:600,marginTop:2}}>{rung.title}</div>
        </div>
        <div style={{display:"flex",gap:5,marginBottom:14}}>
          {rungs.map((_: any,i: number)=>(
            <div key={i} onClick={()=>setSelRung(i)} style={{flex:1,height:5,borderRadius:3,cursor:"pointer",background:i<=selRung?rung.color:"#DDD"}}/>
          ))}
        </div>
        <div style={{fontWeight:700,fontSize:12,textTransform:"uppercase",letterSpacing:"0.07em",color:C2.muted,marginBottom:10}}>
          Streams active at this rung
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
          {rung.streams.map((sk: string)=>(
            <span key={sk} style={{padding:"4px 10px",background:`${SC[sk]?.color||"#999"}20`,color:SC[sk]?.color||"#999",border:`1px solid ${SC[sk]?.color||"#999"}60`,fontSize:12,fontWeight:700,borderRadius:4}}>
              {SC[sk]?.label||sk}
            </span>
          ))}
        </div>
        <div style={{fontWeight:700,fontSize:12,textTransform:"uppercase",letterSpacing:"0.07em",color:rung.color,marginBottom:10}}>
          ✓ Unlock checklist {rung.id<5?`→ Rung ${rung.id+1}`:"— Full program"}
        </div>
        {rung.unlock.map((u: string,i: number)=>{
          const done=checklist[`r${rung.id}`]?.[i]===true;
          return(
            <div key={i} onClick={()=>toggleCheck(rung.id,i)}
              style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px dotted ${C2.border}`,cursor:"pointer",opacity:done?0.55:1}}>
              <span style={{color:done?rung.color:"#CCC",fontSize:14,flexShrink:0}}>{done?"✓":"○"}</span>
              <span style={{fontSize:13,textDecoration:done?"line-through":"none"}}>{u}</span>
            </div>
          );
        })}
        <div style={{marginTop:12,fontSize:11,color:C2.muted}}>Tap to mark done — syncs to all partners.</div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:18}}>
          <button onClick={()=>setSelRung(Math.max(0,selRung-1))} disabled={selRung===0}
            style={{padding:"7px 15px",fontSize:12,border:`1px solid ${C2.border}`,background:selRung===0?"#F7F4ED":"#fff",color:selRung===0?"#CCC":C2.dark,cursor:"pointer",borderRadius:6}}>← Prev</button>
          <button onClick={()=>setSelRung(Math.min(rungs.length-1,selRung+1))} disabled={selRung===rungs.length-1}
            style={{padding:"7px 15px",fontSize:12,border:"none",background:selRung===rungs.length-1?"#F7F4ED":rung.color,color:selRung===rungs.length-1?"#CCC":"#fff",cursor:"pointer",borderRadius:6}}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function PipelineView({pipeline,myStreams,partnerId,isAdmin,getOwnerIds}: any) {
  const [sel,setSel]   = useState<{date:string;si:number}|null>(null);
  const [form,setForm] = useState({streamId:"",headcount:"",notes:"",confirmed:false});
  const dates = useMemo(()=>get14Days(),[]);
  const C2 = {border:"#DDD9D0",muted:"#7A8690",dark:"#1A2830"};

  const canEditCell = (bk: any) => {
    if(isAdmin)return true;
    if(!bk?.streamId)return myStreams.length>0;
    const owners=getOwnerIds(bk.streamId);
    return owners.length===0||owners.includes(partnerId);
  };
  const selectCell=(date: string,si: number)=>{
    const bk=pipeline[date]?.[`s${si}`];
    if(!canEditCell(bk))return;
    setSel({date,si});
    setForm({streamId:bk?.streamId||"",headcount:bk?.headcount||"",notes:bk?.notes||"",confirmed:bk?.confirmed||false});
  };
  const save=()=>{
    if(!sel)return;
    const {date,si}=sel;
    if(!form.streamId){set(ref(db,`/pipeline/${date}/s${si}`),null);}
    else{update(ref(db,`/pipeline/${date}/s${si}`),{...form,by:partnerId});}
    setSel(null);
  };

  return(
    <div>
      <div style={{fontSize:12.5,color:C2.muted,marginBottom:12,background:"#fff",padding:"10px 14px",border:`1px solid ${C2.border}`,borderLeft:`4px solid ${C2.dark}`,borderRadius:4}}>
        {isAdmin?"Admin view — all streams. Tap any cell to book.":
          myStreams.length===0?"⚠ No streams assigned yet. Ask Nitin from Admin panel.":
          `Your streams: ${myStreams.map((s: any)=>s.label).join(", ")}. Others are view-only.`}
      </div>
      <div style={{overflowX:"auto",border:`1px solid ${C2.border}`,background:"#fff",borderRadius:8}}>
        <table style={{borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>
            <th style={{padding:"9px 10px",fontSize:10,fontWeight:600,width:90,textAlign:"left",background:C2.dark,color:"#fff",position:"sticky",left:0,zIndex:2}}>Time slot</th>
            {dates.map(d=>{const{day,num,isWknd}=fmtDate(d);return(
              <th key={d} style={{padding:"6px 3px",fontSize:10,textAlign:"center",minWidth:66,background:isWknd?"#2A3840":C2.dark,color:isWknd?"#F0C040":"#fff"}}>
                <div style={{fontWeight:700}}>{day}</div><div style={{fontSize:12}}>{num}</div>
              </th>
            );})}
          </tr></thead>
          <tbody>
            {SLOTS.map((slot,si)=>(
              <tr key={slot} style={{borderBottom:`1px solid ${C2.border}`}}>
                <td style={{padding:"8px 10px",fontSize:10.5,fontWeight:700,color:C2.muted,borderRight:`1px solid ${C2.border}`,whiteSpace:"nowrap",position:"sticky",left:0,background:"#F7F4ED",zIndex:1}}>
                  <div style={{color:C2.dark}}>{slot}</div>
                  <div style={{fontSize:8.5,color:"#AAA",fontWeight:400}}>{SLOT_NAMES[si]}</div>
                </td>
                {dates.map(d=>{
                  const bk=pipeline[d]?.[`s${si}`];
                  const s=bk?SC[bk.streamId]:null;
                  const isSel=sel?.date===d&&sel?.si===si;
                  const editable=canEditCell(bk);
                  const owners=bk?getOwnerIds(bk.streamId):[];
                  const isMine=bk?owners.includes(partnerId)||owners.length===0:false;
                  return(
                    <td key={d} onClick={()=>selectCell(d,si)}
                      style={{padding:"3px 2px",textAlign:"center",cursor:editable?"pointer":"default",
                        background:isSel?"#FFF9E0":bk?`${s?.color||"#999"}10`:"transparent",
                        borderLeft:`1px solid ${C2.border}`,outline:isSel?`2px solid #E0A000`:"none",
                        minWidth:66,verticalAlign:"middle",opacity:bk&&!isMine&&!isAdmin?0.5:1}}>
                      {bk?(
                        <div style={{background:s?.color||"#999",color:"#fff",fontSize:8.5,fontWeight:700,padding:"3px 3px",borderRadius:3,lineHeight:1.3,margin:"0 2px"}}>
                          <div>{s?.label||bk.streamId}</div>
                          {bk.headcount&&<div style={{opacity:0.85,fontSize:8}}>{bk.headcount} pax</div>}
                          {bk.confirmed&&<div style={{fontSize:7.5}}>✓</div>}
                          {!isMine&&!isAdmin&&<div style={{fontSize:7,background:"rgba(0,0,0,0.3)",borderRadius:2,marginTop:1,padding:"0 2px"}}>view only</div>}
                        </div>
                      ):(editable?<div style={{color:"#DDD",fontSize:18,lineHeight:"38px"}}>+</div>:<div style={{color:"#EBEBEB",fontSize:10,lineHeight:"38px"}}>—</div>)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel&&(
        <div style={{background:"#fff",border:`2px solid #E0A000`,padding:"13px 15px",marginTop:12,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C2.dark,marginBottom:10}}>{SLOTS[sel.si]} · {sel.date}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div>
              <div style={{fontSize:9.5,color:C2.muted,marginBottom:2}}>Stream</div>
              <select value={form.streamId} onChange={e=>setForm(p=>({...p,streamId:e.target.value}))}
                style={{width:190,fontSize:12,border:`1px solid ${C2.border}`,padding:"5px 8px"}}>
                <option value="">— Empty slot —</option>
                {myStreams.map((s: any)=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:9.5,color:C2.muted,marginBottom:2}}>Headcount</div>
              <input type="number" value={form.headcount} min={0} placeholder="0"
                onChange={e=>setForm(p=>({...p,headcount:e.target.value}))}
                style={{width:90,border:`1px solid ${C2.border}`,padding:"5px 8px",fontSize:13}}/>
            </div>
            <div style={{flex:"1 1 140px"}}>
              <div style={{fontSize:9.5,color:C2.muted,marginBottom:2}}>Notes</div>
              <input type="text" value={form.notes} placeholder="Any notes…"
                onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                style={{width:"100%",border:`1px solid ${C2.border}`,padding:"5px 8px",fontSize:13}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <input type="checkbox" checked={form.confirmed} onChange={e=>setForm(p=>({...p,confirmed:e.target.checked}))}/>
              <span style={{fontSize:12}}>Confirmed</span>
            </div>
            <button onClick={save} style={{padding:"6px 14px",background:C2.dark,color:"#fff",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",borderRadius:6}}>Save</button>
            <button onClick={()=>{set(ref(db,`/pipeline/${sel.date}/s${sel.si}`),null);setSel(null);}}
              style={{padding:"6px 12px",background:"#fff",color:"#C4322E",border:"1px solid #C4322E",fontSize:12,cursor:"pointer",borderRadius:6}}>Clear</button>
            <button onClick={()=>setSel(null)}
              style={{padding:"6px 9px",background:"#fff",color:C2.muted,border:`1px solid ${C2.border}`,fontSize:12,cursor:"pointer",borderRadius:6}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareView({pipeline,streamData}: any) {
  const dates = useMemo(()=>get14Days(),[]);
  const cnt: Record<string,number> = {};
  dates.forEach(d=>{Object.values(pipeline[d]||{}).forEach((bk: any)=>{if(bk?.streamId)cnt[bk.streamId]=(cnt[bk.streamId]||0)+1;});});

  const STREAMS_DEF: any[] = [
    {id:"kids",label:"Kids Activity",defaultCount:15,defaultPrice:2500},
    {id:"yoga",label:"Wellness/Yoga",defaultCount:25,defaultPrice:1500},
    {id:"senior",label:"Senior Citizen",defaultCount:20,defaultPrice:100},
    {id:"social",label:"Evening Social",defaultCount:40,defaultPrice:300},
    {id:"events_in",label:"Ticketed Events(TLR)",defaultCount:35,defaultPrice:600,defaultEventsPerMonth:2,isEventStream:true},
    {id:"members",label:"Membership",defaultCount:10,defaultPrice:2000},
    {id:"offsite",label:"Corporate Off-sites",defaultCount:3,defaultPrice:15000},
    {id:"workshop",label:"Workshop/Rental",defaultCount:3,defaultPrice:6000},
    {id:"events_out",label:"Events Outside TLR",defaultCount:35,defaultPrice:500,defaultEventsPerMonth:1,isEventStream:true},
  ];

  const getV=(id: string,f: string)=>{
    const def: any=STREAMS_DEF.find(s=>s.id===id);
    if(f==="count")return streamData[id]?.count??def?.defaultCount??0;
    if(f==="price")return streamData[id]?.price??def?.defaultPrice??0;
    if(f==="epm")  return streamData[id]?.eventsPerMonth??def?.defaultEventsPerMonth??1;
    return 0;
  };
  const tgt=(s: any)=>{
    if(s.isEventStream)return getV(s.id,"epm")*getV(s.id,"count")*getV(s.id,"price");
    return getV(s.id,"count")*getV(s.id,"price");
  };
  const est=(s: any)=>{
    const sessions=(cnt[s.id]||0)*2;
    if(s.isEventStream||s.id==="offsite"||s.id==="workshop")return sessions*getV(s.id,"price");
    return(cnt[s.id]||0)>0?getV(s.id,"count")*getV(s.id,"price"):0;
  };

  const C2={border:"#DDD9D0",muted:"#7A8690",dark:"#1A2830",green:"#1E5C3A",red:"#C4322E"};
  const inrFmt=(v: number)=>"₹"+Math.round(Math.abs(v)).toLocaleString("en-IN");

  return(
    <div>
      <div style={{background:"#fff",border:`1px solid ${C2.border}`,borderRadius:8,overflow:"auto"}}>
        <div style={{padding:"9px 13px 6px",fontSize:10,textTransform:"uppercase",letterSpacing:"0.09em",color:C2.muted,fontWeight:700,borderBottom:`1px solid ${C2.border}`}}>
          Monthly plan vs 2-week pipeline (extrapolated)
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
          <thead><tr style={{background:"#F7F4ED"}}>
            {["Stream","Monthly Target","Pipeline Est.","Gap","Action"].map(h=>(
              <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:C2.muted,borderBottom:`1px solid ${C2.border}`}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {STREAMS_DEF.map(s=>{
              const t=tgt(s),e=est(s),gap=e-t,sess=cnt[s.id]||0;
              const actions: Record<string,string>={
                kids:`Enroll ${Math.ceil(Math.abs(gap)/2500)} more kids`,
                yoga:`Add ${Math.ceil(Math.abs(gap)/1500)} more members`,
                offsite:`Book ${Math.ceil(Math.abs(gap)/15000)} more corporate day(s)`,
                social:"Push Friday Social on WhatsApp",
                members:`Convert ${Math.ceil(Math.abs(gap)/2000)} more members`,
              };
              return(
                <tr key={s.id} style={{borderBottom:`1px solid ${C2.border}`,background:gap<0?"#FEF5F5":"transparent"}}>
                  <td style={{padding:"8px 10px",fontWeight:600}}>
                    <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:SC[s.id]?.color||C2.green,marginRight:6,verticalAlign:"middle"}}/>
                    {s.label}
                  </td>
                  <td style={{padding:"8px 10px",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{inrFmt(t)}</td>
                  <td style={{padding:"8px 10px",color:C2.muted,fontVariantNumeric:"tabular-nums"}}>{inrFmt(e)}<div style={{fontSize:9.5,color:"#AAA"}}>{sess} sessions</div></td>
                  <td style={{padding:"8px 10px",fontWeight:700,color:gap>=0?C2.green:C2.red,fontVariantNumeric:"tabular-nums"}}>{gap>=0?"+":""}{inrFmt(gap)}</td>
                  <td style={{padding:"8px 10px",fontSize:11.5,color:gap>=0?C2.green:C2.red,fontStyle:"italic"}}>{gap>=0?"On track ✓":(actions[s.id]||`Gap of ${inrFmt(Math.abs(gap))}`)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
