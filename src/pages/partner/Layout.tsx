import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { CalendarDays, LogOut, Home } from "lucide-react";

export default function PipelineManagerLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const color = "#1E6B40";

  return (
    <div className="min-h-screen bg-[#F7F4ED] flex">
      {/* Sidebar — intentionally just one item: this role has no other access */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-[#DDD9D0] flex flex-col" style={{ fontFamily:"ui-sans-serif,system-ui,sans-serif" }}>
        <div className="p-5 border-b border-[#DDD9D0]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-serif font-bold text-lg" style={{ background: color }}>LR</div>
            <div>
              <p className="font-bold text-[#1A2830] text-sm">Living Root</p>
              <p className="text-[10px] text-[#7A8690] uppercase tracking-widest">Pipeline</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {user?.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />}
            <span className="text-xs font-bold" style={{ color }}>{user?.name}</span>
          </div>
        </div>

        <nav className="flex-1 p-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium text-white" style={{ background: color }}>
            <CalendarDays size={16} />
            Annual Pipeline
          </div>
        </nav>

        <div className="p-3 border-t border-[#DDD9D0]">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-[#7A8690] hover:bg-[#F7F4ED] hover:text-[#1A2830] transition-all mb-1">
            <Home size={16} /> Public site
          </button>
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm text-[#7A8690] hover:bg-red-50 hover:text-red-500 transition-all">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
