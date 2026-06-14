import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { TrendingUp, Calendar, BookOpen, Users, LogOut, Home, ChevronRight } from "lucide-react";

const NAV = [
  { to: "revenue",  label: "Revenue Plan",  icon: TrendingUp },
  { to: "calendar", label: "Ladder & Calendar", icon: Calendar },
  { to: "daily",    label: "Daily Log",     icon: BookOpen },
  { to: "collabs",  label: "Collaborators", icon: Users },
];

const PARTNER_COLORS: Record<string, string> = {
  nitin:   "#1A2830",
  shruthi: "#C0392B",
  siva:    "#2471A3",
  anusha:  "#1E8449",
};

export default function PartnerLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const color = user?.partnerId ? PARTNER_COLORS[user.partnerId] : "#1A2830";

  return (
    <div className="min-h-screen bg-[#F7F4ED] flex">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-[#DDD9D0] flex flex-col" style={{ fontFamily:"ui-sans-serif,system-ui,sans-serif" }}>
        {/* Logo */}
        <div className="p-5 border-b border-[#DDD9D0]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-serif font-bold text-lg" style={{ background: color }}>LR</div>
            <div>
              <p className="font-bold text-[#1A2830] text-sm">Living Root</p>
              <p className="text-[10px] text-[#7A8690] uppercase tracking-widest">Partner</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {user?.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />}
            <span className="text-xs font-bold" style={{ color }}>{user?.name}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${isActive ? "text-white" : "text-[#7A8690] hover:bg-[#F7F4ED] hover:text-[#1A2830]"}`}
              style={({ isActive }) => isActive ? { background: color } : {}}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#DDD9D0]">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-[#7A8690] hover:bg-[#F7F4ED] hover:text-[#1A2830] transition-all mb-1">
            <Home size={16} /> Public site
          </button>
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-[#7A8690] hover:bg-red-50 hover:text-red-500 transition-all">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
