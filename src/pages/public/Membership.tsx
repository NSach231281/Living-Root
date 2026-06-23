import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell, SectionHeader } from "../../components/ui/LoadingScreen";
import { ArrowRight, Check } from "lucide-react";

const inr = (v: number) => "₹" + v.toLocaleString("en-IN");

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
