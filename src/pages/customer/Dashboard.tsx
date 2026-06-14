import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { PageShell, StatCard } from "../../components/ui/LoadingScreen";
import { Ticket, Calendar, Star, ArrowRight } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending:   "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
};
const PAYMENT_STYLE: Record<string, string> = {
  paid:    "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  refunded:"bg-blue-100 text-blue-700",
};

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const r = ref(db, "/bookings");
    return onValue(r, snap => {
      const data = snap.val() || {};
      const mine = Object.entries(data)
        .map(([id, b]: any) => ({ id, ...b }))
        .filter(b => b.userId === user.uid)
        .sort((a, b) => b.bookedAt - a.bookedAt);
      setBookings(mine);
    });
  }, [user]);

  const confirmed = bookings.filter(b => b.status === "confirmed").length;
  const pending   = bookings.filter(b => b.status === "pending").length;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {user?.photoURL
              ? <img src={user.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-border" />
              : <div className="w-14 h-14 bg-brand-earth rounded-2xl flex items-center justify-center text-brand-gold font-serif text-2xl font-bold">{user?.name?.[0]}</div>
            }
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">Welcome back</p>
              <h1 className="font-serif text-2xl font-bold text-brand-earth">{user?.name}</h1>
              <p className="text-sm text-brand-clay capitalize">{user?.tier || "primary"} member</p>
            </div>
          </div>
          <button onClick={signOut} className="btn-outline text-xs py-2 px-4">Sign out</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard label="Total bookings" value={bookings.length} accent="border-t-brand-spice" />
          <StatCard label="Confirmed" value={confirmed} accent="border-t-green-500" />
          <StatCard label="Pending" value={pending} accent="border-t-yellow-500" sub="Awaiting payment confirmation" />
          <StatCard label="Member tier" value={user?.tier || "Primary"} sub="Upgrade for offers & priority access" accent="border-t-brand-gold" />
        </div>

        {/* Browse CTA */}
        <div className="bg-brand-earth rounded-3xl p-6 mb-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest mb-1">What's on at LR</p>
            <h2 className="font-serif text-white text-xl font-bold">Discover upcoming events</h2>
          </div>
          <Link to="/events" className="btn-secondary text-xs flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
            Browse <ArrowRight size={14} />
          </Link>
        </div>

        {/* Bookings list */}
        <h2 className="font-serif text-xl font-bold text-brand-earth mb-6 flex items-center gap-2">
          <Ticket size={18} className="text-brand-spice" /> My bookings
        </h2>

        {bookings.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <p className="text-4xl mb-4">🎟️</p>
            <p className="font-serif text-xl text-brand-earth mb-2">No bookings yet</p>
            <p className="text-sm mb-6">Find something that resonates and book your first experience.</p>
            <Link to="/events" className="btn-primary text-sm">Explore events</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map(b => (
              <div key={b.id} className="card p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-sand rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-brand-spice" />
                  </div>
                  <div>
                    <p className="font-bold text-brand-earth">{b.eventTitle}</p>
                    <p className="text-sm text-brand-clay">{b.seats} seat{b.seats > 1 ? "s" : ""} · ₹{b.totalAmount}</p>
                    {b.paymentRef && <p className="text-xs text-brand-muted mt-1">UTR: {b.paymentRef}</p>}
                    <p className="text-xs text-brand-muted">{new Date(b.bookedAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${STATUS_STYLE[b.status] || ""}`}>{b.status}</span>
                  <span className={`badge ${PAYMENT_STYLE[b.paymentStatus] || ""}`}>{b.paymentStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
