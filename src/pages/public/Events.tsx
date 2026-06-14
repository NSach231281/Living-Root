import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";
import { PageShell, EventCard, SectionHeader } from "../../components/ui/LoadingScreen";
import { Search, SlidersHorizontal } from "lucide-react";

const VIBES   = ["All", "High Energy", "Chill", "Safe Social", "Creative", "Wellness", "Family", "Kids"];
const BUDGETS = ["All", "Under ₹300", "₹300–₹600", "₹600–₹1000", "₹1000+"];

export default function Events() {
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [searchParams]            = useSearchParams();
  const [activeVibe, setVibe]     = useState(searchParams.get("vibe") || "All");
  const [activeBudget, setBudget] = useState("All");
  const navigate                  = useNavigate();

  useEffect(() => {
    const r = ref(db, "/events");
    return onValue(r, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, e]: any) => ({ id, ...e }))
        .filter(e => e.status === "live")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(list);
      setLoading(false);
    });
  }, []);

  const filtered = events.filter(e => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchVibe   = activeVibe === "All" || (e.vibes || []).includes(activeVibe);
    const matchBudget =
      activeBudget === "All"           ? true :
      activeBudget === "Under ₹300"    ? e.price < 300 :
      activeBudget === "₹300–₹600"    ? e.price >= 300 && e.price <= 600 :
      activeBudget === "₹600–₹1000"   ? e.price > 600 && e.price <= 1000 :
      e.price > 1000;
    return matchSearch && matchVibe && matchBudget;
  });

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader
          eyebrow="What's on"
          title="Events at Living Root"
          subtitle="Real experiences. Real people. Right in JP Nagar."
        />

        {/* Search + filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              className="input pl-11" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <SlidersHorizontal size={16} className="text-brand-muted mt-3 flex-shrink-0" />
            {BUDGETS.map(b => (
              <button key={b} onClick={() => setBudget(b)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeBudget === b ? "bg-brand-earth text-white" : "bg-brand-sand text-brand-clay hover:bg-brand-border"}`}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Vibe filters */}
        <div className="flex gap-2 flex-wrap mb-10">
          {VIBES.map(v => (
            <button key={v} onClick={() => setVibe(v)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeVibe === v ? "bg-brand-spice text-white shadow-lg" : "bg-brand-sand text-brand-clay hover:bg-brand-border"}`}>
              {v}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-brand-sand rounded-3xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-brand-muted">
            <p className="text-5xl mb-4">🌿</p>
            <p className="font-serif text-xl text-brand-earth mb-2">No events found</p>
            <p className="text-sm">Try a different vibe or check back soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(e => (
              <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
