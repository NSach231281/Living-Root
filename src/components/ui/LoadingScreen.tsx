import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Sparkles, Ticket, User, LayoutDashboard, LogOut,
  Menu, X, Home, Calendar, Heart, ChevronRight,
} from "lucide-react";
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

// ─── Public Navbar ─────────────────────────────────────────────────────────────
export function Navbar() {
  const { user, signOut, isAdmin, isPartner } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bone/95 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-earth rounded-xl flex items-center justify-center -rotate-6 shadow-lg">
            <span className="font-serif text-brand-gold text-lg font-bold italic">LR</span>
          </div>
          <span className="font-serif text-brand-earth font-bold text-lg hidden sm:block">Living Root</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/membership" className="text-sm font-bold uppercase tracking-widest text-brand-clay hover:text-brand-spice transition-colors">Membership</Link>
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
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-brand-earth rounded-lg hover:bg-brand-sand transition-colors"
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden bg-brand-bone border-t border-brand-border shadow-lg">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink to="/events" onClick={() => setOpen(false)} label="Events" />
            <MobileNavLink to="/membership" onClick={() => setOpen(false)} label="Membership" />
            {user ? (
              <>
                <MobileNavLink to="/my" onClick={() => setOpen(false)} label="My Bookings" />
                {(isAdmin || isPartner) && (
                  <MobileNavLink to={isAdmin ? "/admin" : "/partner"} onClick={() => setOpen(false)} label="Ops Dashboard" />
                )}
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-brand-muted hover:text-brand-spice flex items-center gap-3"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <div className="pt-2 pb-1">
                <Link to="/login" onClick={() => setOpen(false)} className="btn-primary text-sm py-3 text-center block">
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileNavLink({ to, onClick, label }: { to: string; onClick: () => void; label: string }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 text-sm font-bold text-brand-clay hover:text-brand-spice hover:bg-brand-sand rounded-xl transition-colors"
    >
      {label}
      <ChevronRight size={14} className="text-brand-muted" />
    </Link>
  );
}

// ─── Mobile Bottom Nav (shown on phones) ──────────────────────────────────────
export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const active = (path: string) => location.pathname.startsWith(path) ? "text-brand-spice" : "text-brand-muted";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-bone/95 backdrop-blur-md border-t border-brand-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        <BottomNavItem to="/"         icon={<Home size={20}/>}     label="Home"    active={location.pathname === "/"} />
        <BottomNavItem to="/events"   icon={<Calendar size={20}/>} label="Events"  active={location.pathname.startsWith("/events") || location.pathname.startsWith("/register")} />
        <BottomNavItem to="/membership" icon={<Heart size={20}/>}  label="Join"    active={location.pathname === "/membership"} />
        {user
          ? <BottomNavItem to="/my"   icon={<User size={20}/>}     label="Bookings" active={location.pathname === "/my"} />
          : <BottomNavItem to="/login" icon={<User size={20}/>}    label="Sign in"  active={location.pathname === "/login"} />
        }
      </div>
    </nav>
  );
}

function BottomNavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${active ? "text-brand-spice" : "text-brand-muted"}`}>
      {icon}
      <span className={`text-[10px] font-bold tracking-wide ${active ? "text-brand-spice" : "text-brand-muted"}`}>{label}</span>
    </Link>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="bg-brand-earth text-white mt-16 pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-brand-spice rounded-xl flex items-center justify-center -rotate-6">
              <span className="font-serif text-white text-lg font-bold italic">LR</span>
            </div>
            <span className="font-serif text-white font-bold text-lg">Living Root</span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Your neighbourhood social escape. Community · Connect · Grow.
          </p>
          <p className="text-white/40 text-xs">
            📍 JP Nagar 5th Phase, Bengaluru
          </p>
        </div>

        {/* Explore */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold mb-4">Explore</p>
          <div className="space-y-2">
            {[
              { to: "/events",     label: "Events" },
              { to: "/membership", label: "Membership" },
              { to: "/login",      label: "Sign in" },
            ].map(l => (
              <Link key={l.to} to={l.to} className="block text-sm text-white/60 hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Connect */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold mb-4">Connect</p>
          <div className="space-y-2">
            <a href="https://instagram.com/livingroot.space" target="_blank" rel="noopener noreferrer" className="block text-sm text-white/60 hover:text-white transition-colors">Instagram</a>
            <a href="https://wa.me/919845054981" target="_blank" rel="noopener noreferrer" className="block text-sm text-white/60 hover:text-white transition-colors">WhatsApp</a>
            <a href="mailto:livingrootspace@gmail.com" className="block text-sm text-white/60 hover:text-white transition-colors">Email us</a>
          </div>
        </div>

        {/* Legal */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold mb-4">Legal</p>
          <div className="space-y-2">
            <Link to="/privacy" className="block text-sm text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms"   className="block text-sm text-white/60 hover:text-white transition-colors">Terms &amp; Conditions</Link>
          </div>
          <p className="text-white/30 text-xs mt-6">
            © {new Date().getFullYear()} SANS Collective Ventures.<br />All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bone">
      <Navbar />
      <main className="pt-16 pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
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
  const hasDiscount  = event.originalPrice && event.originalPrice > event.price;
  const pctOff       = hasDiscount ? Math.round(((event.originalPrice - event.price) / event.originalPrice) * 100) : 0;
  const isFree       = event.price === 0;

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer group active:scale-[0.98] hover:-translate-y-1 transition-all duration-300"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative h-44 sm:h-48 overflow-hidden rounded-t-2xl">
        <img
          src={event.imageUrl || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800"}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-earth/70 to-transparent" />
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            {pctOff}% OFF
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
          <p className="text-white font-serif text-base sm:text-lg font-bold leading-snug">{event.title}</p>
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {hasDiscount && <span className="text-white/60 text-xs line-through">₹{event.originalPrice}</span>}
            <span className={`text-white text-xs font-bold px-3 py-1 rounded-full ${isFree ? "bg-emerald-600" : "bg-brand-spice"}`}>
              {isFree ? "Free" : `₹${event.price}`}
            </span>
          </div>
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
            {event.vibes.slice(0, 3).map((v: string) => (
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
  return <span className={`badge ${VIBE_COLORS[vibe] || "bg-brand-sand text-brand-clay"}`}>{vibe}</span>;
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
