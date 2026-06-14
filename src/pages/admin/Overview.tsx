import React, { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";
import { Users, Ticket, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const todayStr = () => new Date().toISOString().split("T")[0];

export default function AdminOverview() {
  const [bookings, setBookings]     = useState<any[]>([]);
  const [leads, setLeads]           = useState<any[]>([]);
  const [users, setUsers]           = useState<any[]>([]);
  const [daily, setDaily]           = useState<any>({});
  const [streams, setStreams]        = useState<any>({});
  const [feedback, setFeedback]     = useState<any[]>([]);

  useEffect(() => {
    const u = [
      onValue(ref(db, "/bookings"),  s => setBookings(Object.values(s.val() || {}))),
      onValue(ref(db, "/leads"),     s => setLeads(Object.values(s.val() || {}))),
      onValue(ref(db, "/users"),     s => setUsers(Object.values(s.val() || {}))),
      onValue(ref(db, "/daily"),     s => setDaily(s.val() || {})),
      onValue(ref(db, "/streams"),   s => setStreams(s.val() || {})),
      onValue(ref(db, "/feedback"),  s => setFeedback(Object.values(s.val() || {}))),
    ];
    return () => u.forEach(x => x());
  }, []);

  const today = todayStr();
  const todayLog = daily[today] || {};
  const todayHC = Object.values(todayLog).reduce((s: number, v: any) => s + (Number(v?.headcount) || 0), 0);

  const pendingBookings  = bookings.filter((b: any) => b.status === "pending").length;
  const confirmedBookings = bookings.filter((b: any) => b.status === "confirmed").length;
  const totalRevenue      = bookings.filter((b: any) => b.paymentStatus === "paid").reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const pipelineValue     = leads.reduce((s: number, l: any) => s + (Number(l.value) || 0), 0);
  const confirmedLeads    = leads.filter((l: any) => l.status === "confirmed").reduce((s: number, l: any) => s + (Number(l.value) || 0), 0);
  const newFeedback       = feedback.filter((f: any) => f.status === "new").length;
  const customers         = users.filter((u: any) => u.role === "customer").length;

  // Revenue by stream for chart
  const ALL_STREAMS_DEF = [
    {id:"kids",label:"Kids",defaultCount:15,defaultPrice:2500},
    {id:"yoga",label:"Yoga",defaultCount:25,defaultPrice:1500},
    {id:"senior",label:"Senior",defaultCount:20,defaultPrice:100},
    {id:"social",label:"Social",defaultCount:40,defaultPrice:300},
    {id:"events_in",label:"Events",defaultCount:35,defaultPrice:600,epm:2},
    {id:"members",label:"Members",defaultCount:10,defaultPrice:2000},
    {id:"offsite",label:"Corporate",defaultCount:3,defaultPrice:15000},
    {id:"workshop",label:"Workshop",defaultCount:3,defaultPrice:6000},
  ];
  const chartData = ALL_STREAMS_DEF.map(s => {
    const count = streams[s.id]?.count ?? s.defaultCount;
    const price = streams[s.id]?.price ?? s.defaultPrice;
    const rev   = s.epm ? (s.epm * count * price) : (count * price);
    return { name: s.label, rev };
  });
  const COLORS = ["#1E6B40","#1E6B40","#2E8B57","#27AE60","#2471A3","#7D3C98","#B7770D","#C67C1A"];

  const pendingPayments = bookings.filter((b: any) => b.status === "pending");

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">Admin dashboard</p>
        <h1 className="font-serif text-3xl font-bold text-brand-earth">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Nitin.</h1>
        <p className="text-brand-clay mt-1">{new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
      </div>

      {/* Alerts */}
      {(pendingBookings > 0 || newFeedback > 0) && (
        <div className="mb-6 flex flex-col gap-3">
          {pendingBookings > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <AlertCircle size={18} className="text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-800 font-medium">
                <b>{pendingBookings} booking(s)</b> waiting for payment confirmation — review and approve in the Events tab.
              </p>
            </div>
          )}
          {newFeedback > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <AlertCircle size={18} className="text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-800 font-medium">
                <b>{newFeedback} new feedback item(s)</b> awaiting your review in the Feedback tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label:"Today's headcount",    value:todayHC,             sub:"across all sessions",      icon:<Users size={18}/>,   accent:"border-t-brand-spice" },
          { label:"Pending bookings",     value:pendingBookings,      sub:"awaiting confirmation",     icon:<Clock size={18}/>,   accent:"border-t-orange-400" },
          { label:"Revenue confirmed",    value:inr(totalRevenue),    sub:"from paid bookings",        icon:<TrendingUp size={18}/>,accent:"border-t-green-500" },
          { label:"Corporate pipeline",   value:inr(pipelineValue),  sub:`${inr(confirmedLeads)} confirmed`, icon:<Ticket size={18}/>, accent:"border-t-brand-gold" },
          { label:"Total customers",      value:customers,            sub:"registered accounts",       icon:<Users size={18}/>,   accent:"border-t-sky-500" },
          { label:"Confirmed bookings",   value:confirmedBookings,    sub:"this month",               icon:<CheckCircle size={18}/>,accent:"border-t-green-500" },
          { label:"Pipeline value",       value:inr(pipelineValue),  sub:`${leads.length} active leads`, icon:<TrendingUp size={18}/>,accent:"border-t-purple-500" },
          { label:"Feedback pending",     value:newFeedback,          sub:"new items to review",      icon:<AlertCircle size={18}/>,accent:"border-t-blue-500" },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-2xl p-5 border border-brand-border border-t-4 ${card.accent} shadow-card`}>
            <div className="flex items-center gap-2 mb-2 text-brand-muted">{card.icon}<p className="text-xs font-bold uppercase tracking-widest">{card.label}</p></div>
            <p className="font-serif text-2xl font-bold text-brand-earth">{card.value}</p>
            <p className="text-xs text-brand-muted mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by stream */}
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-1">Monthly revenue plan</h2>
          <p className="text-xs text-brand-muted mb-5">Based on current stream settings</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:0,right:0,left:0,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:10}} />
              <YAxis hide />
              <Tooltip formatter={(v: any) => [inr(v), "Revenue"]} />
              <Bar dataKey="rev" radius={[4,4,0,0]}>
                {chartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pending payments to approve */}
        <div className="bg-white rounded-2xl p-6 border border-brand-border shadow-card">
          <h2 className="font-serif text-lg font-bold text-brand-earth mb-1">Pending payment approvals</h2>
          <p className="text-xs text-brand-muted mb-5">Bookings waiting for your confirmation</p>
          {pendingPayments.length === 0 ? (
            <div className="text-center py-8 text-brand-muted">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
              {pendingPayments.slice(0,6).map((b: any, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <div>
                    <p className="font-bold text-sm text-brand-earth">{b.eventTitle}</p>
                    <p className="text-xs text-brand-muted">{b.userName} · {b.seats} seat(s) · UTR: {b.paymentRef || "not provided"}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-earth">{inr(b.totalAmount)}</span>
                </div>
              ))}
              {pendingPayments.length > 6 && (
                <p className="text-xs text-center text-brand-muted">+{pendingPayments.length - 6} more in Events tab</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
