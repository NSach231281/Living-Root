import React, { useEffect, useState } from "react";
import { useParams, Link }             from "react-router-dom";
import { onValue, ref }                from "firebase/database";
import { db }                          from "../../firebase";
import {
  Calendar, Clock, MapPin, ArrowLeft, Copy, CheckCircle,
  MessageCircle, Loader2,
} from "lucide-react";
import BrandedTicket from "../../components/ui/BrandedTicket";
import { PageShell } from "../../components/ui/LoadingScreen";

type Step = "info" | "pay" | "done";

const API      = "";
const UPI_ID   = import.meta.env.VITE_UPI_ID   || "livingroot@yesbank";
const UPI_NAME = import.meta.env.VITE_UPI_NAME  || "Living Root Space";
const VENUE    = "Living Root, JP Nagar 5th Phase, Bengaluru";

export default function Register() {
  const { id } = useParams<{ id: string }>();

  const [event,        setEvent]        = useState<any>(null);
  const [step,         setStep]         = useState<Step>("info");
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [seats,        setSeats]        = useState(1);
  const [paymentRef,   setPaymentRef]   = useState("");
  const [copied,       setCopied]       = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [waSending,    setWaSending]    = useState(false);
  const [waSent,       setWaSent]       = useState(false);
  const [ticketRef,    setTicketRef]    = useState("");
  const [ticketStatus, setTicketStatus] = useState<"confirmed" | "pending_payment">("confirmed");

  useEffect(() => {
    if (!id) return;
    return onValue(ref(db, `/events/${id}`), snap => {
      if (snap.exists()) setEvent({ id, ...snap.val() });
    });
  }, [id]);

  if (!event) return (
    <PageShell>
      <div className="max-w-xl mx-auto px-6 py-24 text-center text-brand-muted">
        <Loader2 className="mx-auto animate-spin mb-4" size={28}/>
        Loading event…
      </div>
    </PageShell>
  );

  const total   = event.price * seats;
  const isFree  = event.price === 0;
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent(event.title)}`;

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitRegistration = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/register-event`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          eventId:    id,
          eventTitle: event.title,
          eventDate:  event.date,
          eventTime:  event.time,
          eventVenue: VENUE,
          eventPrice: event.price,
          name, email, phone, seats,
          paymentRef: isFree ? "" : paymentRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setTicketRef(data.ticketRef);
      setTicketStatus(data.status);
      setStep("done");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInfoNext = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill all fields"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address"); return;
    }
    setError("");
    if (isFree) submitRegistration();
    else        setStep("pay");
  };

  const handlePayNext = async () => {
    if (!paymentRef.trim()) { setError("Please enter your transaction/UTR ID"); return; }
    await submitRegistration();
  };

  const sendWhatsApp = async () => {
    setWaSending(true);
    try {
      const res = await fetch(`${API}/api/send-whatsapp`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          phone, name,
          eventTitle: event.title,
          eventDate:  event.date,
          eventTime:  event.time,
          eventVenue: VENUE,
          seats, ticketRef,
        }),
      });
      if (res.ok) setWaSent(true);
      else throw new Error("WhatsApp send failed");
    } catch {
      setError("Couldn't send WhatsApp. Check your ticket email instead.");
    } finally {
      setWaSending(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-xl mx-auto px-5 py-10">
        <Link to={`/events/${id}`} className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-spice mb-6 transition-colors">
          <ArrowLeft size={15}/> Back to event
        </Link>

        {/* Event summary strip */}
        <div className="card overflow-hidden mb-6">
          {event.imageUrl && (
            <div className="h-36 relative">
              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-brand-earth/70 to-transparent"/>
              <h1 className="absolute bottom-3 left-4 right-4 font-serif text-xl font-bold text-white">{event.title}</h1>
            </div>
          )}
          {!event.imageUrl && (
            <div className="bg-brand-earth p-5">
              <h1 className="font-serif text-xl font-bold text-brand-bone">{event.title}</h1>
            </div>
          )}
          <div className="px-4 py-3 flex flex-wrap gap-4 text-xs text-brand-clay bg-brand-bone">
            <span className="flex items-center gap-1.5"><Calendar size={12} className="text-brand-spice"/>{event.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={12} className="text-brand-spice"/>{event.time}</span>
            <span className="flex items-center gap-1.5"><MapPin size={12} className="text-brand-spice"/>{VENUE}</span>
          </div>
        </div>

        {/* STEP 1 — Info */}
        {step === "info" && (
          <div className="card p-6">
            <h2 className="font-serif text-xl font-bold text-brand-earth mb-5">
              {isFree ? "Register for free" : `Register · ₹${event.price}/person`}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Your name *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Full name"/>
              </div>
              <div>
                <label className="label">Email address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="your@email.com"/>
                <p className="text-xs text-brand-muted mt-1">Your ticket will be emailed here</p>
              </div>
              <div>
                <label className="label">WhatsApp / Phone *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+91 XXXXX XXXXX"/>
              </div>
              <div>
                <label className="label">Number of seats</label>
                <div className="flex items-center gap-4 mt-1">
                  <button onClick={() => setSeats(s => Math.max(1, s - 1))}
                    className="w-9 h-9 rounded-full border-2 border-brand-border flex items-center justify-center font-bold hover:border-brand-spice transition-colors">−</button>
                  <span className="font-serif text-xl font-bold text-brand-earth w-6 text-center">{seats}</span>
                  <button onClick={() => setSeats(s => Math.min(event.seatsLeft || 10, s + 1))}
                    className="w-9 h-9 rounded-full border-2 border-brand-border flex items-center justify-center font-bold hover:border-brand-spice transition-colors">+</button>
                </div>
              </div>
            </div>

            {!isFree && (
              <div className="bg-brand-sand rounded-xl p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-brand-muted">Total</p>
                  <p className="font-serif text-2xl font-bold text-brand-earth">₹{total}</p>
                  <p className="text-xs text-brand-muted">{seats} seat{seats > 1 ? "s" : ""} × ₹{event.price}</p>
                </div>
                {event.originalPrice > event.price && (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {Math.round(((event.originalPrice - event.price) / event.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              onClick={handleInfoNext}
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin"/>}
              {isFree
                ? submitting ? "Registering…" : "Register — it's free!"
                : `Continue to payment · ₹${total} →`}
            </button>
          </div>
        )}

        {/* STEP 2 — Pay */}
        {step === "pay" && (
          <div className="card p-6">
            <h2 className="font-serif text-xl font-bold text-brand-earth mb-1">Pay to confirm</h2>
            <p className="text-sm text-brand-clay mb-6">Send ₹{total} via UPI, then paste your transaction ID below.</p>

            <div className="bg-brand-sand rounded-2xl p-5 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mb-3">Pay via UPI</p>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-brand-muted">UPI ID</p>
                  <p className="font-bold text-brand-earth">{UPI_ID}</p>
                </div>
                <button onClick={copyUPI} className="flex items-center gap-1.5 text-xs font-bold text-brand-spice border border-brand-spice/30 px-3 py-1.5 rounded-lg hover:bg-brand-spice hover:text-white transition-all">
                  {copied ? <CheckCircle size={12}/> : <Copy size={12}/>}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-brand-muted">Amount: <span className="font-bold text-brand-earth text-base">₹{total}</span></p>
              <a href={upiLink} className="btn-primary block text-center text-sm mt-4">Open UPI app →</a>
            </div>

            <div className="mb-5">
              <label className="label">Transaction ID / UTR *</label>
              <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="input" placeholder="e.g. 123456789012"/>
              <p className="text-xs text-brand-muted mt-1">Find this in your UPI app → payment history</p>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep("info")} className="btn-outline flex-1 text-sm">← Back</button>
              <button onClick={handlePayNext} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting && <Loader2 size={14} className="animate-spin"/>}
                {submitting ? "Submitting…" : "I've paid →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Done */}
        {step === "done" && (
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🌿</div>
              <h2 className="font-serif text-2xl font-bold text-brand-earth">
                {ticketStatus === "confirmed" ? "You're in!" : "Booking received!"}
              </h2>
              <p className="text-brand-clay text-sm mt-2 max-w-sm mx-auto">
                {ticketStatus === "confirmed"
                  ? `Your ticket has been emailed to ${email}. Show the QR code at the door.`
                  : `We'll verify your payment and email your ticket to ${email} within a few hours.`}
              </p>
            </div>

            <div className="mb-6">
              <BrandedTicket
                name={name}
                eventTitle={event.title}
                eventDate={event.date}
                eventTime={event.time}
                eventVenue={VENUE}
                seats={seats}
                ticketRef={ticketRef}
                status={ticketStatus}
              />
            </div>

            {ticketStatus === "confirmed" && (
              <div className="card p-5 mb-5 text-center">
                <p className="text-sm font-bold text-brand-earth mb-3">Also get this ticket on WhatsApp</p>
                {waSent ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle size={16}/> Sent to {phone}!
                  </div>
                ) : (
                  <button
                    onClick={sendWhatsApp}
                    disabled={waSending}
                    className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-[#25D366] text-white font-bold rounded-xl text-sm hover:bg-[#1da85a] transition-colors disabled:opacity-50"
                  >
                    {waSending ? <Loader2 size={15} className="animate-spin"/> : <MessageCircle size={15}/>}
                    {waSending ? "Sending…" : "Send to WhatsApp"}
                  </button>
                )}
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Link to={`/events/${id}`} className="btn-outline text-sm text-center">← Back to event</Link>
              <Link to="/events"         className="btn-outline text-sm text-center">Browse more events</Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
