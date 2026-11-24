// /crm — staff area for the Bookings module. Any staff role (admin, partner, marketing, pipeline manager).
import React, { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useOutletContext } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useCrm, needsAction, type Row } from "./data";
import type { RateCard } from "../shared/rateCard";
import { QR } from "../client/ui";
import { DEMO } from "../client/api";
import { Plus, Share2, Table2, CalendarDays, Scale, Settings, ArrowLeft, X, Copy } from "lucide-react";

export const STAFF = ["admin", "partner", "marketing", "pipeline_manager"];
export interface CrmCtx { rows: Row[]; rc: RateCard; isAdmin: boolean }
export const useCrmCtx = () => useOutletContext<CrmCtx>();

export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (DEMO) return <>{children}</>;
  if (loading) return <LoadingScreen/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (!STAFF.includes(user.role as string)) return <Navigate to="/" replace/>;
  return <>{children}</>;
}

export default function CrmLayout() {
  const { user } = useAuth();
  const { rows, rc, loading, error } = useCrm();
  const [share, setShare] = useState(false);
  const isAdmin = user?.role === "admin" || DEMO;
  const home = isAdmin ? "/admin" : user?.role === "marketing" ? "/marketing" : user?.role === "pipeline_manager" ? "/pipeline-manager" : "/partner";
  const actions = rows.filter(r => needsAction(r)).length;
  const tab = ({ isActive }: { isActive: boolean }) => `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? "bg-white text-brand-earth" : "text-white/70 hover:text-white"}`;

  return (
    <div className="min-h-screen bg-[#F7F4ED]">
      <header className="bg-[#1A2830] text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-2">
          <Link to={home} className="p-2 text-white/60 hover:text-white" title="Back to dashboard"><ArrowLeft size={18}/></Link>
          <span className="font-serif font-bold text-lg mr-2 hidden sm:block">Bookings</span>
          <nav className="flex gap-1 overflow-x-auto flex-1">
            <NavLink to="/crm" end className={tab}><Table2 size={15}/> CRM {actions > 0 && <span className="bg-brand-spice text-white text-[10px] font-bold rounded-full px-1.5">{actions}</span>}</NavLink>
            <NavLink to="/crm/calendar" className={tab}><CalendarDays size={15}/> Calendar</NavLink>
            <NavLink to="/crm/reconcile" className={tab}><Scale size={15}/> Reconcile</NavLink>
            {isAdmin && <NavLink to="/crm/settings" className={tab}><Settings size={15}/> Settings</NavLink>}
          </nav>
          <button onClick={() => setShare(true)} className="p-2 text-white/70 hover:text-white" title="Share booking link"><Share2 size={18}/></button>
          <Link to="/crm/new/advanced" className="hidden md:block text-xs text-white/60 hover:text-white px-2" title="Subscriptions, late-night plans, custom packages">Advanced</Link>
          <Link to="/crm/new" className="flex items-center gap-1 bg-brand-spice px-3 py-2 rounded-lg text-sm font-bold"><Plus size={15}/> <span className="hidden sm:inline">New</span></Link>
        </div>
      </header>
      {error && <div className="max-w-7xl mx-auto p-3 text-sm text-red-700">Could not load bookings: {error}. Have the new database rules been published? (BOOKINGS_SETUP.md step 4)</div>}
      {loading ? <div className="p-10 text-center text-brand-muted">Loading…</div> : <Outlet context={{ rows, rc, isAdmin } satisfies CrmCtx}/>}
      {share && <ShareModal onClose={() => setShare(false)}/>}
    </div>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const base = `${location.origin}/book`;
  const [src, setSrc] = useState("instagram");
  const url = src ? `${base}?src=${encodeURIComponent(src)}` : base;
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3"><h3 className="font-serif font-bold text-lg">Public booking link</h3><button onClick={onClose}><X size={18}/></button></div>
        <p className="text-xs text-brand-muted mb-3">Put this in your Instagram bio, Facebook page, Google profile or WhatsApp status. The <b>src</b> tag tells you in the CRM where each enquiry came from.</p>
        <div className="flex flex-wrap gap-1 mb-3">{["instagram", "facebook", "google", "whatsapp", "website", ""].map(s =>
          <button key={s} onClick={() => setSrc(s)} className={`text-xs px-2 py-1 rounded-lg border ${src === s ? "bg-brand-earth text-white" : "border-brand-border"}`}>{s || "no tag"}</button>)}</div>
        <div className="flex justify-center"><QR text={url} size={200}/></div>
        <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); }} className="mt-3 w-full bg-brand-bone rounded-xl px-3 py-2 text-xs font-mono break-all flex items-center gap-2"><Copy size={12} className="shrink-0"/>{copied ? "Copied!" : url}</button>
        <p className="text-[11px] text-brand-muted mt-2">Long-press / right-click the QR to save it for posters and posts.</p>
      </div>
    </div>
  );
}
