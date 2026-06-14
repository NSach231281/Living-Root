import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { onValue, ref, update, push } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { PageShell, VibeBadge } from "../../components/ui/LoadingScreen";
import { Calendar, Clock, Users, ArrowLeft, Copy, CheckCircle } from "lucide-react";

const UPI_ID   = import.meta.env.VITE_UPI_ID   || "livingroot@yesbank";
const UPI_NAME = import.meta.env.VITE_UPI_NAME  || "Living Root Space";

type Step = "detail" | "form" | "pay" | "done";

export default function EventDetail() {
  const { id }              = useParams();
  const { user }            = useAuth();
  const navigate            = useNavigate();
  const [event, setEvent]   = useState<any>(null);
  const [step, setStep]     = useState<Step>("detail");
  const [seats, setSeats]   = useState(1);
  const [phone, setPhone]   = useState(user?.email || "");
  const [ref_, setRef_]     = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    return onValue(ref(db, `/events/${id}`), snap => {
      if (snap.exists()) setEvent({ id, ...snap.val() });
    });
  }, [id]);

  if (!event) return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-20 text-center text-brand-muted">Loading…</div>
    </PageShell>
  );

  const total     = event.price * seats;
  const upiLink   = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent(event.title)}`;

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmBooking = async () => {
    if (!user) { navigate("/login"); return; }
    setSubmitting(true);
    const bookingRef = ref(db, "/bookings");
    await push(bookingRef, {
      eventId:       id,
      eventTitle:    event.title,
      userId:        user.uid,
      userName:      user.name,
      userEmail:     user.email,
      userPhone:     phone,
      seats,
      totalAmount:   total,
      paymentStatus: "pending",
      paymentRef:    ref_,
      status:        "pending",
      bookedAt:      Date.now(),
    });
    // Decrement seats
    await update(ref(db, `/events/${id}`), { seatsLeft: Math.max(0, (event.seatsLeft || 0) - seats) });
    setStep("done");
    setSubmitting(false);
  };

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link to="/events" className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-spice mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to events
        </Link>

        {/* Event hero */}
        <div className="card overflow-hidden mb-8">
          <div className="relative h-72 md:h-96">
            <img src={event.imageUrl || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1200"} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-earth/80 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {(event.vibes || []).map((v: string) => <VibeBadge key={v} vibe={v} />)}
              </div>
              <h1 className="font-serif text-white text-3xl md:text-4xl font-bold">{event.title}</h1>
            </div>
          </div>

          <div className="p-6 grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <p className="text-brand-clay leading-relaxed mb-6">{event.description}</p>
              <div className="flex flex-wrap gap-6 text-sm text-brand-muted">
                <span className="flex items-center gap-2"><Calendar size={15} className="text-brand-spice" />{event.date}</span>
                <span className="flex items-center gap-2"><Clock size={15} className="text-brand-spice" />{event.time}</span>
                <span className="flex items-center gap-2"><Users size={15} className="text-brand-spice" />{event.seatsLeft} seats remaining</span>
              </div>
            </div>
            <div className="bg-brand-sand rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">Price per person</p>
              <p className="font-serif text-3xl font-bold text-brand-earth mb-4">₹{event.price}</p>
              {step === "detail" && (
                <button onClick={() => { if (!user) navigate("/login"); else setStep("form"); }}
                  className="btn-primary w-full text-sm">
                  {user ? "Book now" : "Sign in to book"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Booking flow */}
        {step === "form" && (
          <div className="card p-6 md:p-8">
            <h2 className="font-serif text-2xl font-bold text-brand-earth mb-6">Your booking</h2>
            <div className="mb-6">
              <label className="label">Number of seats</label>
              <div className="flex items-center gap-4">
                <button onClick={() => setSeats(s => Math.max(1, s - 1))} className="w-10 h-10 rounded-full border-2 border-brand-border flex items-center justify-center font-bold text-lg hover:border-brand-spice transition-colors">−</button>
                <span className="font-serif text-2xl font-bold text-brand-earth w-8 text-center">{seats}</span>
                <button onClick={() => setSeats(s => Math.min(event.seatsLeft || 1, s + 1))} className="w-10 h-10 rounded-full border-2 border-brand-border flex items-center justify-center font-bold text-lg hover:border-brand-spice transition-colors">+</button>
              </div>
            </div>
            <div className="mb-6">
              <label className="label">Your phone number (for event updates)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="input" />
            </div>
            <div className="bg-brand-sand rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-brand-muted">Total amount</p>
                <p className="font-serif text-2xl font-bold text-brand-earth">₹{total}</p>
                <p className="text-xs text-brand-muted">{seats} seat{seats > 1 ? "s" : ""} × ₹{event.price}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("detail")} className="btn-outline flex-1 text-sm">Back</button>
              <button onClick={() => setStep("pay")} className="btn-primary flex-1 text-sm">Pay ₹{total} →</button>
            </div>
          </div>
        )}

        {step === "pay" && (
          <div className="card p-6 md:p-8">
            <h2 className="font-serif text-2xl font-bold text-brand-earth mb-2">Pay to confirm your spot</h2>
            <p className="text-brand-clay text-sm mb-8">Send ₹{total} via UPI to the details below. Then enter your UTR/transaction ID to confirm your booking.</p>

            {/* UPI details */}
            <div className="bg-brand-sand rounded-2xl p-6 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-4">Pay via UPI</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-brand-muted">UPI ID</p>
                  <p className="font-bold text-brand-earth text-lg">{UPI_ID}</p>
                </div>
                <button onClick={copyUPI} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-spice border border-brand-spice/30 px-4 py-2 rounded-xl hover:bg-brand-spice hover:text-white transition-all">
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mb-3">
                <p className="text-xs text-brand-muted">Name</p>
                <p className="font-bold text-brand-earth">{UPI_NAME}</p>
              </div>
              <div className="mb-4">
                <p className="text-xs text-brand-muted">Amount</p>
                <p className="font-bold text-brand-earth text-xl">₹{total}</p>
              </div>
              <a href={upiLink} className="btn-primary w-full text-sm text-center block">
                Open UPI app →
              </a>
            </div>

            {/* UTR entry */}
            <div className="mb-6">
              <label className="label">Transaction ID / UTR (12-digit number from your payment app)</label>
              <input value={ref_} onChange={e => setRef_(e.target.value)} placeholder="e.g. 123456789012" className="input" />
              <p className="text-xs text-brand-muted mt-1">Find this in your UPI app under payment history</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("form")} className="btn-outline flex-1 text-sm">Back</button>
              <button onClick={confirmBooking} disabled={!ref_ || submitting}
                className="btn-primary flex-1 text-sm disabled:opacity-50">
                {submitting ? "Confirming…" : "I've paid — confirm booking"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="font-serif text-2xl font-bold text-brand-earth mb-2">Booking received!</h2>
            <p className="text-brand-clay mb-2">We've noted your payment reference <span className="font-bold text-brand-earth">{ref_}</span>.</p>
            <p className="text-brand-clay mb-8 text-sm">The Living Root team will verify and confirm your booking within a few hours. You'll see it in <Link to="/my" className="text-brand-spice underline">My Bookings</Link>.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/my" className="btn-primary text-sm">See my bookings</Link>
              <Link to="/events" className="btn-outline text-sm">Browse more events</Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
