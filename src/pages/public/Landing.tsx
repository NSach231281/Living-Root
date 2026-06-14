import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";
import { PageShell, EventCard, VibeBadge } from "../../components/ui/LoadingScreen";
import { ArrowRight, MapPin, Users, Sparkles, Star } from "lucide-react";

const VIBES = ["High Energy", "Chill", "Safe Social", "Creative", "Wellness", "Family", "Kids"];

export default function Landing() {
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const r = ref(db, "/events");
    return onValue(r, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, e]: any) => ({ id, ...e }))
        .filter(e => e.status === "live")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);
      setEvents(list);
    });
  }, []);

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-brand-earth">
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1600"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-earth/40 via-transparent to-brand-earth" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32">
          <div className="flex items-center gap-2 text-brand-gold mb-6">
            <MapPin size={14} />
            <span className="text-xs font-bold uppercase tracking-[0.25em]">JP Nagar, Bangalore</span>
          </div>

          <h1 className="font-serif text-white text-5xl md:text-7xl font-bold leading-[1.05] mb-8 max-w-3xl">
            Your neighbourhood<br />
            <span className="text-brand-gold italic">social escape.</span>
          </h1>

          <p className="text-white/70 text-xl max-w-xl mb-12 leading-relaxed">
            Events, experiences, and real connection — right in JP Nagar. No algorithm. No screens. Just people, place, and moment.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/events" className="btn-primary text-sm py-4 px-8 flex items-center gap-2">
              Explore events <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-secondary text-sm py-4 px-8 border-white/30 text-white hover:bg-white/10">
              Sign in
            </Link>
          </div>

          {/* Vibe tags */}
          <div className="flex flex-wrap gap-2 mt-16">
            {VIBES.map(v => (
              <span key={v} onClick={() => navigate(`/events?vibe=${encodeURIComponent(v)}`)}
                className="cursor-pointer px-3 py-1 rounded bg-white/10 text-white/70 text-xs font-bold uppercase tracking-widest hover:bg-brand-spice hover:text-white transition-all duration-200">
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-brand-sand border-y border-brand-border">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { num: "7+",    label: "Experience types" },
            { num: "₹300",  label: "Starts from" },
            { num: "JP Nagar", label: "Right here" },
            { num: "Open",  label: "Community" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-serif text-2xl font-bold text-brand-earth">{s.num}</p>
              <p className="text-xs text-brand-muted uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming events */}
      {events.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-spice mb-2">What's on</p>
              <h2 className="font-serif text-4xl text-brand-earth font-bold">Upcoming at LR</h2>
            </div>
            <Link to="/events" className="btn-outline text-xs hidden md:flex items-center gap-2">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map(e => (
              <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />
            ))}
          </div>
          <div className="mt-6 md:hidden">
            <Link to="/events" className="btn-outline w-full text-center block">See all events</Link>
          </div>
        </section>
      )}

      {/* What is LR */}
      <section className="bg-brand-earth text-white py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-[0.25em] mb-4">The space</p>
            <h2 className="font-serif text-4xl font-bold leading-tight mb-6">
              Not a café. Not a club.<br />Something better.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Living Root is a curated social space for Bangalore's curious, creative, and connected. We host events across 7 formats — from Wellness mornings to Friday Jams to ticketed experiences — all under one thoughtfully designed roof.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { icon: <Sparkles size={18} />, t: "7 curated experience formats" },
                { icon: <Users size={18} />,    t: "Community memberships from ₹2,000/month" },
                { icon: <Star size={18} />,     t: "Private corporate bookings available" },
              ].map(item => (
                <div key={item.t} className="flex items-center gap-3 text-white/80">
                  <span className="text-brand-gold">{item.icon}</span>
                  <span className="text-sm">{item.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1544787210-2283034f71db?q=80&w=800"
              alt="Living Root space"
              className="rounded-3xl w-full h-80 object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-spice mb-4">Be part of it</p>
        <h2 className="font-serif text-4xl text-brand-earth font-bold mb-6">Ready to find your people?</h2>
        <p className="text-brand-clay mb-10 max-w-md mx-auto">Sign up for free. Browse events. Book your spot. Join the community.</p>
        <Link to="/login" className="btn-primary text-sm py-4 px-10 inline-flex items-center gap-2">
          Get started <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-brand-sand py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-brand-muted">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-earth rounded-lg flex items-center justify-center">
              <span className="font-serif text-brand-gold text-sm font-bold italic">LR</span>
            </div>
            <span className="font-bold text-brand-earth">Living Root Space</span>
            <span>· JP Nagar, Bangalore</span>
          </div>
          <div className="flex gap-6">
            <Link to="/events" className="hover:text-brand-spice transition-colors">Events</Link>
            <a href="mailto:hello@livingrootspace.com" className="hover:text-brand-spice transition-colors">Contact</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-spice transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </PageShell>
  );
}
