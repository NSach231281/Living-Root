import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard, Ticket, TrendingUp, BarChart2,
  MessageSquare, Users, LogOut, Globe, Settings
} from "lucide-react";

const NAV = [
  { to:"overview",   label:"Overview",    icon:LayoutDashboard },
  { to:"events",     label:"Events",      icon:Ticket          },
  { to:"financials", label:"Financials",  icon:TrendingUp      },
  { to:"analytics",  label:"Analytics",   icon:BarChart2       },
  { to:"feedback",   label:"Feedback",    icon:MessageSquare   },
  { to:"users",      label:"Users",       icon:Users           },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F4ED] flex" style={{fontFamily:"ui-sans-serif,system-ui,sans-serif"}}>
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 bg-[#1A2830] flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-brand-gold/40 flex items-center justify-center">
              <span className="font-serif text-brand-gold text-lg font-bold italic">LR</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Living Root</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full opacity-80" />}
            <span className="text-xs text-white/60 font-medium">{user?.name}</span>
            <span className="text-[9px] bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded ml-auto uppercase tracking-widest">Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-3 mt-2">Operations</p>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all
                 ${isActive ? "bg-white/12 text-white" : "text-white/50 hover:bg-white/6 hover:text-white/80"}`
              }>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-3 mt-6">Quick links</p>
          <button onClick={() => navigate("/partner")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-white/50 hover:bg-white/6 hover:text-white/80 transition-all mb-1">
            <Settings size={16} /> Partner ops
          </button>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-white/50 hover:bg-white/6 hover:text-white/80 transition-all">
            <Globe size={16} /> Public site
          </button>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <button onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-white/40 hover:bg-red-900/30 hover:text-red-400 transition-all">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
