import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function PipelineManagerLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-[#F7F4ED]">
      <div className="flex items-center justify-between px-6 py-3 bg-[#1A2830] text-white">
        <span className="font-bold text-sm">Living Roots · Pipeline</span>
        <div className="flex items-center gap-4 text-xs">
          <a href="/admin/bookings" className="text-white/70 hover:text-white">Bookings</a>
          <span className="text-white/60">{user?.name}</span>
          <a href="/crm" className="text-white/80 hover:text-white mr-4 font-semibold">Bookings &amp; CRM</a>
          <button onClick={signOut} className="text-white/60 hover:text-white">Sign out</button>
        </div>
      </div>
      <Outlet/>
    </div>
  );
}
