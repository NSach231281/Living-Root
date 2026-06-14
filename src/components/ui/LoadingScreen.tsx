import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Sparkles, Ticket, User, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

// ─── Loading Screen ───────────────────────────────────────────────────────────
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-bone flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-earth rounded-2xl flex items-center justify-center mx-auto mb-4 -rotate-6 shadow-xl">
          <span className="font-serif text-brand-gold text-3xl font-bold italic">LR</span>
        </div>
        <div className="w-6 h-6 border-2 border-brand-spice border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}

// ─── Public Navbar ────────────────────────────────────────────────────────────
export function Navbar() {
  const { user, signOut, isAdmin, isPartner } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bone/90 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-earth rounded-xl flex items-center justify-center -rotate-6 shadow-lg">
            <span className="font-serif text-brand-gold text-lg font-bold italic">LR</span>
          </div>
          <span className="font-serif text-brand-earth font-bold text-lg hidden sm:block">Living Root</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/events" className="text-sm font-bold uppercase tracking-widest text-brand-clay hover:text-brand-spice transition-colors">Events</Link>
          {user ? (
            <div className="flex items-center gap-4">
              {(isAdmin || isPartner) && (
                <Link to={isAdmin ? "/admin" : "/partner"} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-clay hover:text-brand-spice transition-colors">
                  <LayoutDashboard size={15} /> Ops
                </Link>
              )}
              <Link to="/my" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-clay hover:text-brand-spice transition-colors">
                <User size={15} /> My Bookings
              </Link>
              <button onClick={signOut} className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-spice transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary text-xs py-2 px-5">Sign in</Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-brand-earth">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-brand-bone border-t border-brand-border px-6 py-4 flex flex-col gap-4">
          <Link to="/events" onClick={() => setOpen(false)} className="text-sm font-bold uppercase tracking-widest text-brand-clay">Events</Link>
          {user ? (
            <>
              {(isAdmin || isPartner) && <Link to={isAdmin ? "/admin" : "/partner"} onClick={() => setOpen(false)} className="text-sm font-bold uppercase tracking-widest text-brand-clay">Ops Dashboard</Link>}
              <Link to="/my" onClick={() => setOpen(false)} className="text-sm font-bold uppercase tracking-widest text-brand-clay">My Bookings</Link>
              <button onClick={() => { signOut(); setOpen(false); }} className="text-sm text-brand-muted text-left">Sign out</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)} className="btn-primary text-xs py-2 px-5 text-center">Sign in</Link>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bone">
      <Navbar />
      <main className="pt-16">{children}</main>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-10">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-spice mb-2">{eyebrow}</p>}
      <h2 className="font-serif text-3xl md:text-4xl text-brand-earth font-bold">{title}</h2>
      {subtitle && <p className="text-brand-clay mt-3 max-w-xl">{subtitle}</p>}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────
export function EventCard({ event, onClick }: { event: any; onClick?: () => void }) {
  const seatsPercent = ((event.seatsLeft || 0) / (event.seatsTotal || 1)) * 100;
  return (
    <div onClick={onClick} className="card cursor-pointer group hover:-translate-y-1 transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img src={event.imageUrl || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800"} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-earth/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <p className="text-white font-serif text-lg font-bold">{event.title}</p>
          <span className="bg-brand-spice text-white text-xs font-bold px-3 py-1 rounded-full">₹{event.price}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-brand-clay text-sm mb-3 line-clamp-2">{event.description}</p>
        <div className="flex items-center justify-between text-xs text-brand-muted">
          <span>{event.date} · {event.time}</span>
          <span className={seatsPercent < 20 ? "text-red-500 font-bold" : ""}>{event.seatsLeft} seats left</span>
        </div>
        {seatsPercent < 30 && (
          <div className="mt-2 h-1 bg-brand-sand rounded-full overflow-hidden">
            <div className="h-full bg-brand-spice rounded-full" style={{ width: `${100 - seatsPercent}%` }} />
          </div>
        )}
        {event.vibes && (
          <div className="flex flex-wrap gap-1 mt-3">
            {event.vibes.slice(0,3).map((v: string) => (
              <span key={v} className="badge bg-brand-sand text-brand-clay">{v}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vibe badge ───────────────────────────────────────────────────────────────
const VIBE_COLORS: Record<string, string> = {
  "High Energy": "bg-brand-spice text-white",
  "Chill":       "bg-brand-gold text-brand-earth",
  "Safe Social": "bg-brand-clay text-white",
  "Creative":    "bg-emerald-600 text-white",
  "Wellness":    "bg-brand-clay/30 text-brand-earth",
  "Family":      "bg-sky-500 text-white",
  "Kids":        "bg-yellow-400 text-brand-earth",
};
export function VibeBadge({ vibe }: { vibe: string }) {
  return (
    <span className={`badge ${VIBE_COLORS[vibe] || "bg-brand-sand text-brand-clay"}`}>{vibe}</span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-brand-border border-t-4 ${accent || "border-t-brand-spice"} shadow-card`}>
      <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">{label}</p>
      <p className="font-serif text-2xl font-bold text-brand-earth">{value}</p>
      {sub && <p className="text-xs text-brand-muted mt-1">{sub}</p>}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon, title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="text-center py-16 text-brand-muted">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <p className="font-serif text-xl text-brand-earth mb-2">{title}</p>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  );
}
