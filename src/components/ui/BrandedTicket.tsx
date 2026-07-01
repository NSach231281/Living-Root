import React from "react";
import { Calendar, Clock, MapPin, User, Users, Hash } from "lucide-react";

interface Props {
  name:       string;
  eventTitle: string;
  eventDate:  string;
  eventTime:  string;
  eventVenue: string;
  seats:      number;
  ticketRef:  string;
  status:     "confirmed" | "pending_payment" | "cancelled";
  appUrl?:    string;
}

const QR_BASE = "https://api.qrserver.com/v1/create-qr-code";

export default function BrandedTicket({
  name, eventTitle, eventDate, eventTime, eventVenue,
  seats, ticketRef, status,
  appUrl = window.location.origin,
}: Props) {
  const qrData = encodeURIComponent(`${appUrl}/ticket/${ticketRef}`);
  const qrUrl  = `${QR_BASE}/?size=140x140&data=${qrData}&color=2C1810&bgcolor=F5F0E8&qzone=1`;

  const statusBadge = {
    confirmed:       { bg: "bg-emerald-100", text: "text-emerald-800", label: "✅ Confirmed" },
    pending_payment: { bg: "bg-amber-100",   text: "text-amber-800",   label: "⏳ Payment pending" },
    cancelled:       { bg: "bg-red-100",     text: "text-red-700",     label: "❌ Cancelled" },
  }[status];

  return (
    <div className="w-full max-w-md mx-auto select-none" id="lr-ticket">
      {/* Top band */}
      <div className="bg-brand-earth rounded-t-2xl px-6 py-5 text-brand-bone">
        <div className="flex items-center gap-2 mb-3">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="#C4622D"/>
            <path d="M18 8C18 8 10 14 10 20C10 25 13.5 28 18 28C22.5 28 26 25 26 20C26 14 18 8 18Z" fill="#F5F0E8"/>
            <path d="M18 15L18 28M14 19C14 19 16 21 18 20M22 19C22 19 20 21 18 20" stroke="#2C1810" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-serif text-lg font-bold tracking-tight">Living Root</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold mb-1">
          Event Ticket
        </p>
        <h2 className="font-serif text-xl font-bold leading-snug">{eventTitle}</h2>
      </div>

      {/* Body */}
      <div className="bg-white border-x border-brand-border px-6 py-5">
        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 ${statusBadge.bg} ${statusBadge.text}`}>
          {statusBadge.label}
        </span>

        <div className="flex items-start gap-6 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-0.5">Attendee</p>
            <div className="flex items-center gap-1.5">
              <User size={13} className="text-brand-spice"/>
              <span className="font-serif text-base font-bold text-brand-earth">{name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Users size={12} className="text-brand-muted"/>
              <span className="text-xs text-brand-clay">{seats} seat{seats > 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="border-l border-dashed border-brand-border pl-6">
            <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-0.5">Ticket Ref</p>
            <div className="flex items-center gap-1.5">
              <Hash size={12} className="text-brand-spice"/>
              <span className="font-mono text-sm font-bold text-brand-spice tracking-wider">{ticketRef}</span>
            </div>
          </div>
        </div>

        <div className="bg-brand-bone rounded-xl p-3 space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-brand-earth">
            <Calendar size={13} className="text-brand-spice flex-shrink-0"/>
            <span className="font-bold">{eventDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-brand-earth">
            <Clock size={13} className="text-brand-spice flex-shrink-0"/>
            <span>{eventTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-brand-earth">
            <MapPin size={13} className="text-brand-spice flex-shrink-0"/>
            <span>{eventVenue}</span>
          </div>
        </div>
      </div>

      {/* Tear line */}
      <div className="relative bg-white border-x border-brand-border">
        <div className="border-t-2 border-dashed border-brand-border mx-0"/>
        <div className="absolute -left-3 -top-2.5 w-5 h-5 rounded-full bg-brand-bone border border-brand-border"/>
        <div className="absolute -right-3 -top-2.5 w-5 h-5 rounded-full bg-brand-bone border border-brand-border"/>
      </div>

      {/* QR section */}
      <div className="bg-white rounded-b-2xl border-x border-b border-brand-border px-6 py-5 flex flex-col items-center gap-3">
        <p className="text-
