import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell, SectionHeader } from "../../components/ui/LoadingScreen";
import {
  ArrowRight, Check, Clock, Heart, Music, Gamepad2, Footprints,
  Calendar, Palette, Video, Briefcase, Star, Gift, Building2, Crown,
} from "lucide-react";

const inr = (v: number) => "₹" + v.toLocaleString("en-IN");

// ─── Membership plans ───────────────────────────────────────────────────────
const PLANS = [
  {
    key: "sprout", name: "The Sprout", who: "For 2 Adults",
    sessions: 32, breakdown: "16 Health  ·  16 Happiness",
    alaCarte: 7800, price: 6299, save: 1501, savePct: 19, perSession: 197,
    hero: false,
    note: "+ Add Wealth access (coworking & workshops) from ₹999/mo",
  },
  {
    key: "sapling", name: "The Sapling", who: "For 2 Parents + 2 Children",
    sessions: 44, breakdown: "16 Health  ·  6 Wealth  ·  22 Happiness",
    alaCarte: 16400, price: 11999, save: 4401, savePct: 27, perSession: 273,
    hero: true,
  },
  {
    key: "banyan", name: "The Banyan", who: "6 People · 3 Generations",
    sessions: 64, breakdown: "28 Health  ·  6 Wealth  ·  30 Happiness",
    alaCarte: 20000, price: 13999, save: 6001, savePct: 30, perSession: 219,
    hero: false,
  },
];

type FamilyKey = "Grandparents" | "Parents" | "Children";

const MENU: Record<FamilyKey, Record<"Health" | "Wealth" | "Happiness", string[]>> = {
  Grandparents: {
    Health:    ["Chair Yoga & Stretch", "Morning Walking Club", "Health Screening Camp", "Sound Healing Session"],
    Wealth:    ["Tech-for-Seniors Workshop", "Legacy Storytelling Circle", "Gardening Masterclass", "Wills & Finance Talk"],
    Happiness: ["Carrom & Cards Evening", "Classic Cinema Screening", "Festival Celebrations", "Music Appreciation Circle"],
  },
  Parents: {
    Health:    ["Yoga & Pilates", "Zumba / Dance Fitness", "Strength & Mobility", "Meditation & Breathwork"],
    Wealth:    ["Co-working Day Pass", "Investing 101 Workshop", "Career Networking Mixer", "Parenting Circle"],
    Happiness: ["Live Music Fridays", "Wine & Paint Night", "Stand-up Comedy Night", "Board Game Social"],
  },
  Children: {
    Health:    ["Kids Yoga & Movement", "Swimming & Sports Club", "Martial Arts Taster", "Dance Fitness for Kids"],
    Wealth:    ["Coding for Kids", "Art & Craft Studio", "Public Speaking Club", "Robotics Workshop"],
    Happiness: ["Movie Afternoon", "Treasure Hunt Day", "Talent Show Friday", "Outdoor Games Day"],
  },
};

// ─── Space rental ───────────────────────────────────────────────────────────
const USE_CASES = ["Friends & Family", "Birthday Parties", "Kitty Parties", "Social & Corp Events", "Board Game Nights", "Small Gatherings"];

const RENTAL_PLANS = [
  { key: "quick", name: "Quick Gather", dur: "3 Hours", price: 5500, perHr: 1833, hero: false,
    desc: "Kitty parties, small birthdays, focused meetings",
    incl: ["Space access, AC & WiFi", "Music system included", "Seating for up to 40"] },
  { key: "half", name: "The Half Day", dur: "5–6 Hours", price: 9500, perHr: 1727, hero: true,
    desc: "Birthday parties, baby showers, social mixers",
    incl: ["Everything in Quick Gather", "Setup/breakdown buffer", "Dedicated host on-site", "Basic decor & catering coordination"] },
  { key: "full", name: "The Full Day", dur: "10–12 Hours", price: 16500, perHr: 1500, hero: false,
    desc: "Big celebrations, off-sites, elaborate events",
    incl: ["Everything in Half Day", "Extended setup window", "Priority slot booking", "Welcome refreshments included"] },
];

// ─── Collaborators ──────────────────────────────────────────────────────────
const COLLAB_TYPES = [
  { icon: Heart,      label: "Wellness Experts" },
  { icon: Music,      label: "Musicians" },
  { icon: Gamepad2,   label: "Gamers" },
  { icon: Footprints, label: "Dancers" },
  { icon: Calendar,   label: "Event Organizers" },
  { icon: Palette,    label: "Painters & Artists" },
  { icon: Video,      label: "Content Creators" },
  { icon: Briefcase,  label: "& More" },
];

const COLLAB_BENEFITS = [
  "Access to a curated, ready-made community",
  "A beautiful space — zero setup hassle",
  "Cross-promotion to our member base",
  "Fair, transparent revenue share",
];

// ─── Creative packages ──────────────────────────────────────────────────────
const PACKAGES = [
  { icon: Star, name: "Founding Circle", tag: "Loyalty mechanic",
    desc: "Lock today's price, forever. The first 100 family memberships get a lifetime price-lock plus founder recognition.",
    why: "Turns scarcity into urgency — and rewards the families who bet on us first." },
  { icon: Gift, name: "Gift a Root", tag: "Gifting mechanic",
    desc: "Gift a month (or three) of Sprout or Sapling to someone else — parents, a friend's family, a new neighbour.",
    why: "Opens a festive-season channel: Diwali, Rakhi, milestone birthdays, new-baby gifts." },
  { icon: Building2, name: "Corporate Wellness Bridge", tag: "B2B mechanic",
    desc: "Bulk flex-credits sold to companies as an employee wellness benefit, redeemable across all three pillars.",
    why: "Taps corporate budgets directly and fills our quietest weekday daytime capacity." },
  { icon: Crown, name: "The Concierge Circle", tag: "Top-of-market tier",
    desc: "An invite-only tier above The Banyan: priority evening slots, a dedicated host, quarterly private hosting credits.",
    why: "Captures the highest end of JP Nagar without raising prices for everyone else." },
];

export default function Membership() {
  const [activeFamily, setActiveFamily] = useState<FamilyKey>("Parents");
  const navigate = useNavigate();

  return (
    <PageShell>
      {/* Hero */}
      <section className="bg-brand-earth py-20 px-6 text-center">
        <p className="text-brand-gold text-xs font-bold uppercase tracking-[0.25em] mb-3">
          JP Nagar's single-stop family subscription
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-white font-bold mb-4">Rooted Together</h1>
        <p className="text-white/70 text-lg max-w-xl mx-auto">
          One family membership spanning Health, Wealth & Happiness — sized to however your household grows.
        </p>
        <p className="text-brand-gold text-sm font-bold mt-6">Only 55 family memberships open each month</p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`card p-7 relative flex flex-col ${plan.hero ? "md:-mt-6 border-2 border-brand-gold shadow-elite" : ""}`}
            >
              {plan.hero && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-spice text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                  Most Popular
                </span>
              )}
              <h3 className="font-serif text-2xl font-bold text-brand-earth text-center mt-3">{plan.name}</h3>
              <p className="text-brand-clay text-sm text-center italic mb-5">{plan.who}</p>

              <p className="text-center">
                <span className="font-serif text-5xl font-bold text-brand-spice">{plan.sessions}</span>
                <span className="text-brand-clay text-sm"> sessions/mo</span>
              </p>
              <p className="text-center text-xs text-brand-clay mt-2">{plan.breakdown}</p>

              <div className="flex flex-col gap-1.5 mt-5 mb-5">
                <p className="flex items-center gap-2 text-xs text-brand-clay"><Check size={13} className="text-brand-spice" /> Personalised calendar per member</p>
                <p className="flex items-center gap-2 text-xs text-brand-clay"><Check size={13} className="text-brand-spice" /> Priority booking on top events</p>
              </div>

              <div className="text-center mt-auto pt-4 border-t border-brand-border">
                <p className="text-xs text-brand-muted">
                  À la carte value: <span className="line-through">{inr(plan.alaCarte)}</span>/mo
                </p>
                <p className="font-serif text-4xl font-bold text-brand-earth mt-1">
                  {inr(plan.price)}<span className="text-sm text-brand-muted font-sans"> /mo</span>
                </p>
                <p className="text-brand-spice text-sm font-bold mt-1">
                  Save {inr(plan.save)}/mo · {plan.savePct}% off
                </p>
                <p className="text-xs text-brand-muted italic mt-1">≈ {inr(plan.perSession)}/session</p>
              </div>

              {plan.note && <p className="text-xs text-center text-amber-700 italic mt-4">{plan.note}</p>}

              <button onClick={() => navigate("/login")} className="btn-primary w-full mt-6 text-sm">
                Choose {plan.name.replace("The ", "")}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-brand-muted mt-10 italic max-w-2xl mx-auto">
          Beyond your monthly sessions, access is à la carte — and premium, high-demand events are priced higher to protect availability.
        </p>
      </section>

      {/* Monthly menu */}
      <section className="bg-brand-sand py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            eyebrow="Choose your month"
            title="3–5 options under every pillar"
            subtitle="Mix, match and swap your picks each month — for every generation under your roof."
          />
          <div className="flex gap-2 justify-center mb-10 flex-wrap">
            {(Object.keys(MENU) as FamilyKey[]).map(f => (
              <button
                key={f}
                onClick={() => setActiveFamily(f)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${
                  activeFamily === f ? "bg-brand-earth text-white" : "bg-white text-brand-clay hover:bg-brand-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {(["Health", "Wealth", "Happiness"] as const).map(pillar => (
              <div key={pillar} className="card p-5">
                <h4 className="font-serif font-bold text-lg text-brand-earth mb-4 text-center">{pillar}</h4>
                <ul className="space-y-2.5">
                  {MENU[activeFamily][pillar].map(item => (
                    <li key={item} className="text-sm text-brand-clay flex items-start gap-2">
                      <span className="text-brand-spice mt-1 flex-shrink-0">•</span>{item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-brand-muted italic mt-4">+ more added monthly</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEW: Rent the space ─────────────────────────────────────────── */}
      <section className="bg-brand-earth py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-brand-gold text-xs font-bold uppercase tracking-[0.25em] mb-3 text-center">Private Bookings</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white font-bold text-center mb-4">Host Your Moment Here</h2>
          <p className="text-white/70 text-center max-w-xl mx-auto mb-8">
            1,750 sq ft of curated space for friends, family, and the gatherings worth showing up for.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {USE_CASES.map(u => (
              <span key={u} className="px-4 py-1.5 rounded-full border border-brand-gold/40 text-brand-gold text-xs font-bold">{u}</span>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {RENTAL_PLANS.map(plan => (
              <div key={plan.key} className={`card p-6 relative flex flex-col ${plan.hero ? "md:-mt-4 border-2 border-brand-gold shadow-elite" : ""}`}>
                {plan.hero && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-spice text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                    Most Booked
                  </span>
                )}
                <div className="w-12 h-12 rounded-full bg-brand-sand border border-brand-gold flex items-center justify-center mx-auto mt-2 mb-3">
                  <Clock size={20} className="text-brand-earth" />
                </div>
                <h3 className="font-serif text-xl font-bold text-brand-earth text-center">{plan.name}</h3>
                <p className="text-brand-spice text-sm font-bold italic text-center mb-2">{plan.dur}</p>
                <p className="text-brand-clay text-xs text-center italic mb-4">{plan.desc}</p>
                <p className="font-serif text-3xl font-bold text-brand-earth text-center">{inr(plan.price)}</p>
                <p className="text-xs text-brand-muted text-center mb-4">≈ {inr(plan.perHr)}/hour</p>
                <div className="flex flex-col gap-1.5 mt-auto">
                  {plan.incl.map(item => (
                    <p key={item} className="flex items-start gap-2 text-xs text-brand-clay">
                      <Check size={12} className="text-brand-spice mt-0.5 flex-shrink-0" />{item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/50 mt-10 italic max-w-3xl mx-auto">
            Up to 80 guests standing / 60 seated · Weekend bookings +20% · ₹3,000 refundable security deposit · Catering, decor & AV add-ons available on request
          </p>
        </div>
      </section>

      {/* ── NEW: Join the Circle (collaborators) ─────────────────────────── */}
      <section className="bg-brand-sand py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            eyebrow="Join the Circle"
            title="Bring Your Craft To Living Root"
            subtitle="We're always looking for the people who make Health, Wealth & Happiness come alive."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {COLLAB_TYPES.map(c => (
              <div key={c.label} className="card p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-brand-sand border border-brand-gold flex items-center justify-center mx-auto mb-3">
                  <c.icon size={20} className="text-brand-earth" />
                </div>
                <p className="font-bold text-sm text-brand-earth">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {COLLAB_BENEFITS.map(b => (
              <p key={b} className="flex items-start gap-2 text-sm text-brand-clay">
                <Check size={14} className="text-brand-spice mt-0.5 flex-shrink-0" />{b}
              </p>
            ))}
          </div>
          <p className="text-center text-brand-spice font-bold italic">
            Interested? Reach out — hello@livingrootspace.com
          </p>
        </div>
      </section>

      {/* ── NEW: Beyond the Basics (creative packages) ───────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader
          eyebrow="Beyond the Basics"
          title="Four Ideas Worth Piloting"
          subtitle="Pricing moves that don't fit neatly into 'membership' or 'rental' — but should still make us money."
        />
        <div className="grid md:grid-cols-4 gap-5">
          {PACKAGES.map(p => (
            <div key={p.name} className="card p-5 flex flex-col">
              <div className="w-12 h-12 rounded-full bg-brand-sand border border-brand-gold flex items-center justify-center mx-auto mb-3">
                <p.icon size={20} className="text-brand-earth" />
              </div>
              <h3 className="font-serif text-lg font-bold text-brand-earth text-center mb-1">{p.name}</h3>
              <p className="text-brand-spice text-xs font-bold uppercase tracking-wide text-center mb-3">{p.tag}</p>
              <p className="text-sm text-brand-clay text-center mb-4">{p.desc}</p>
              <p className="text-xs text-brand-earth font-bold italic text-center mt-auto">{p.why}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-brand-muted mt-8 italic max-w-3xl mx-auto">
          Also worth piloting: an Off-Peak Pass (steep discount, weekday-only) to fill dead morning slots, and a Community Host track that turns engaged members into paid collaborators.
        </p>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6">
        <h2 className="font-serif text-3xl text-brand-earth font-bold mb-4">Ready to join the circle?</h2>
        <p className="text-brand-clay mb-8 max-w-md mx-auto">
          Sign up, pick a plan that fits your household, and start booking this month's sessions.
        </p>
        <button onClick={() => navigate("/login")} className="btn-primary text-sm py-4 px-10 inline-flex items-center gap-2">
          Get started <ArrowRight size={16} />
        </button>
      </section>
    </PageShell>
  );
}
