import React, { useState, useEffect } from "react";
import { onValue, ref, push, update, set } from "firebase/database";
import { db } from "../../firebase";
import { Plus, Edit2, Trash2, CheckCircle, X, Eye, EyeOff } from "lucide-react";

const VIBES = ["High Energy","Chill","Safe Social","Creative","Wellness","Family","Kids","Professional"];
const STREAMS = ["kids","yoga","senior","social","events_in","members","offsite","workshop","events_out"];
const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

const BLANK_EVENT = {
  title:"", description:"", date:"", time:"", price:0,originalPrice:0,
  seatsTotal:0, seatsLeft:0, vibes:[] as string[], imageUrl:"",
  audienceType:[] as string[], stream:"social", status:"draft" as const,
};

export default function AdminEvents() {
  const [events,   setEvents]   = useState<any>({});
  const [bookings, setBookings] = useState<any>({});
  const [tab, setTab]           = useState<"events"|"bookings">("events");
  const [form,   setForm]       = useState<any>(BLANK_EVENT);
  const [editId, setEditId]     = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const u = [
      onValue(ref(db, "/events"),   s => setEvents(s.val() || {})),
      onValue(ref(db, "/bookings"), s => setBookings(s.val() || {})),
    ];
    return () => u.forEach(x => x());
  }, []);

  const save = async () => {
    if (!form.title || !form.date) return;
    const data = { ...form, seatsLeft: editId ? form.seatsLeft : form.seatsTotal, createdBy:"nitin" };
    if (editId) { await update(ref(db, `/events/${editId}`), data); }
    else { await push(ref(db, "/events"), data); }
    setForm(BLANK_EVENT); setEditId(null); setShowForm(false);
  };

  const deleteEvent = (id: string) => { if (window.confirm("Delete this event?")) set(ref(db, `/events/${id}`), null); };
  const toggleStatus = (id: string, ev: any) => update(ref(db, `/events/${id}`), { status: ev.status === "live" ? "draft" : "live" });

  const confirmBooking = (id: string, b: any) => update(ref(db, `/bookings/${id}`), { status:"confirmed", paymentStatus:"paid", confirmedBy:"nitin", confirmedAt:Date.now() });
  const rejectBooking  = (id: string) => update(ref(db, `/bookings/${id}`), { status:"cancelled" });

  const eventList   = Object.entries(events).map(([id,e]: any)=>({id,...e})).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
  const bookingList = Object.entries(bookings).map(([id,b]: any)=>({id,...b})).sort((a,b)=>b.bookedAt-a.bookedAt);
  const pending     = bookingList.filter(b=>b.status==="pending");
  const confirmed   = bookingList.filter(b=>b.status==="confirmed");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-earth">Events</h1>
          <p className="text-sm text-brand-muted">Create events, manage bookings, confirm payments</p>
        </div>
        <button onClick={() => { setForm(BLANK_EVENT); setEditId(null); setShowForm(true); }}
          className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> New event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-brand-border mb-6">
        {[["events","Events"],["bookings","Bookings"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab===k?"border-brand-earth text-brand-earth":"border-transparent text-brand-muted"}`}>
            {l} {k==="bookings"&&pending.length>0&&<span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">{pending.length}</span>}
          </button>
        ))}
      </div>

      {/* Create/edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 mb-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-lg font-bold text-brand-earth">{editId ? "Edit event" : "New event"}</h2>
            <button onClick={() => setShowForm(false)} className="text-brand-muted hover:text-brand-earth"><X size={20} /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="label">Event title *</label>
              <input value={form.title} onChange={e=>setForm((p: any)=>({...p,title:e.target.value}))} className="input" placeholder="e.g. Friday Jam Night" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e=>setForm((p: any)=>({...p,description:e.target.value}))} className="input" rows={3} placeholder="Tell people what this event is about…" />
            </div>
            <div><label className="label">Date *</label><input type="date" value={form.date} onChange={e=>setForm((p: any)=>({...p,date:e.target.value}))} className="input"/></div>
            <div><label className="label">Time</label><input type="time" value={form.time} onChange={e=>setForm((p: any)=>({...p,time:e.target.value}))} className="input"/></div>
            <div>
              <label className="label">Price (₹) — what the customer pays</label>
              <input type="number" value={form.price} min={0} onChange={e=>setForm((p: any)=>({...p,price:Number(e.target.value)}))} className="input"/>
            </div>
            <div>
              <label className="label">Original Price (₹) — optional, shows a strikethrough discount</label>
              <input type="number" value={form.originalPrice||""} min={0} placeholder="Leave blank for no discount badge" onChange={e=>setForm((p: any)=>({...p,originalPrice:Number(e.target.value)}))} className="input"/>
              {form.originalPrice > form.price && form.price > 0 && (
                <p className="text-xs text-emerald-600 font-bold mt-1">
                  Shows as {Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100)}% OFF — ₹{form.originalPrice} → ₹{form.price}
                </p>
              )}
            </div>            
            <div><label className="label">Total seats</label><input type="number" value={form.seatsTotal} min={0} onChange={e=>setForm((p: any)=>({...p,seatsTotal:Number(e.target.value)}))} className="input"/></div>
            <div><label className="label">Image URL</label><input value={form.imageUrl} onChange={e=>setForm((p: any)=>({...p,imageUrl:e.target.value}))} className="input" placeholder="https://images.unsplash.com/…"/></div>
            <div>
              <label className="label">Revenue stream</label>
              <select value={form.stream} onChange={e=>setForm((p: any)=>({...p,stream:e.target.value}))} className="input">
                {STREAMS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Vibes</label>
              <div className="flex flex-wrap gap-2">
                {VIBES.map(v=>(
                  <button key={v} type="button" onClick={()=>setForm((p: any)=>({...p,vibes:p.vibes.includes(v)?p.vibes.filter((x: string)=>x!==v):[...p.vibes,v]}))}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full border transition-all ${form.vibes.includes(v)?"bg-brand-earth text-white border-brand-earth":"border-brand-border text-brand-clay hover:border-brand-spice"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e=>setForm((p: any)=>({...p,status:e.target.value}))} className="input">
                <option value="draft">Draft</option>
                <option value="live">Live</option>
                <option value="sold_out">Sold out</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setShowForm(false); setForm(BLANK_EVENT); }} className="btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={save} className="btn-primary flex-1 text-sm">{editId ? "Save changes" : "Create event"}</button>
          </div>
        </div>
      )}

      {tab === "events" && (
        <div className="flex flex-col gap-3">
          {eventList.length === 0 ? (
            <div className="text-center py-16 text-brand-muted bg-white rounded-2xl border border-brand-border">
              <p className="text-4xl mb-3">🎟️</p>
              <p className="font-serif text-xl text-brand-earth mb-2">No events yet</p>
              <p className="text-sm mb-5">Create your first event to get it live on the public site.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Create first event</button>
            </div>
          ) : eventList.map(ev => {
            const evBookings = bookingList.filter(b=>b.eventId===ev.id);
            const booked = ev.seatsTotal - (ev.seatsLeft||0);
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-brand-border p-5 flex flex-wrap items-center gap-5 shadow-card">
                {ev.imageUrl && <img src={ev.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-brand-earth">{ev.title}</h3>
                    <span className={`badge ${ev.status==="live"?"bg-green-100 text-green-700":ev.status==="draft"?"bg-gray-100 text-gray-600":"bg-orange-100 text-orange-700"}`}>{ev.status}</span>
                  </div>
                  <p className="text-sm text-brand-clay">{ev.date} · {ev.time} · ₹{ev.price}</p>
                  <p className="text-xs text-brand-muted mt-1">{booked}/{ev.seatsTotal} booked · {evBookings.length} booking(s)</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={()=>toggleStatus(ev.id,ev)} className="p-2 rounded-lg border border-brand-border hover:border-brand-spice text-brand-muted hover:text-brand-spice transition-colors" title={ev.status==="live"?"Set draft":"Set live"}>
                    {ev.status==="live"?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                  <button onClick={()=>{setForm({...BLANK_EVENT,...ev});setEditId(ev.id);setShowForm(true);}} className="p-2 rounded-lg border border-brand-border hover:border-brand-spice text-brand-muted hover:text-brand-spice transition-colors">
                    <Edit2 size={16}/>
                  </button>
                  <button onClick={()=>deleteEvent(ev.id)} className="p-2 rounded-lg border border-brand-border hover:border-red-400 text-brand-muted hover:text-red-400 transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "bookings" && (
        <div>
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="font-serif text-lg font-bold text-brand-earth mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block"/> Pending confirmation ({pending.length})
              </h2>
              <div className="flex flex-col gap-3">
                {pending.map(b => (
                  <div key={b.id} className="bg-orange-50 rounded-2xl border border-orange-200 p-5 flex flex-wrap items-center gap-5">
                    <div className="flex-1">
                      <p className="font-bold text-brand-earth">{b.eventTitle}</p>
                      <p className="text-sm text-brand-clay">{b.userName} · {b.userEmail}</p>
                      <p className="text-sm text-brand-clay">{b.seats} seat(s) · {inr(b.totalAmount)}</p>
                      {b.paymentRef && <p className="text-xs text-brand-muted mt-1">UTR: <span className="font-mono font-bold">{b.paymentRef}</span></p>}
                      {b.userPhone && <p className="text-xs text-brand-muted">Phone: {b.userPhone}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={()=>confirmBooking(b.id,b)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors">
                        <CheckCircle size={15}/> Confirm
                      </button>
                      <button onClick={()=>rejectBooking(b.id)} className="flex items-center gap-2 px-4 py-2 bg-white text-red-500 border border-red-300 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors">
                        <X size={15}/> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="font-serif text-lg font-bold text-brand-earth mb-3">All bookings ({bookingList.length})</h2>
          <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead><tr className="bg-brand-sand">
                {["Event","Customer","Seats","Amount","Payment","Status","Date"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-brand-muted">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {bookingList.map(b=>(
                  <tr key={b.id} className="border-t border-brand-border hover:bg-brand-sand/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-brand-earth">{b.eventTitle}</td>
                    <td className="px-4 py-3 text-brand-clay">{b.userName}<br/><span className="text-xs text-brand-muted">{b.userEmail}</span></td>
                    <td className="px-4 py-3 text-center font-bold">{b.seats}</td>
                    <td className="px-4 py-3 font-bold text-brand-earth">{inr(b.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={`badge ${b.paymentStatus==="paid"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-600"}`}>{b.paymentStatus}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${b.status==="confirmed"?"bg-green-100 text-green-700":b.status==="pending"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-600"}`}>{b.status}</span></td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{new Date(b.bookedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookingList.length === 0 && <div className="text-center py-12 text-brand-muted">No bookings yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
