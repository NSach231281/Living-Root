import React, { useState } from "react";
import { Link2, MessageCircle, Facebook, Twitter, Check } from "lucide-react";

interface Props {
  eventId:      string;
  eventTitle:   string;
  eventDate:    string;
  eventTime:    string;
  description?: string;
}

const QR_BASE = "https://api.qrserver.com/v1/create-qr-code";

export default function SharePanel({ eventId, eventTitle, eventDate, eventTime }: Props) {
  const [copied, setCopied] = useState(false);

  const registerUrl = `${window.location.origin}/register/${eventId}`;
  const shareText   = encodeURIComponent(
    `🌿 ${eventTitle}\n📅 ${eventDate}  ⏰ ${eventTime}\n\nRegister here 👇`
  );

  const waLink  = `https://wa.me/?text=${shareText}%0A${encodeURIComponent(registerUrl)}`;
  const fbLink  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(registerUrl)}&quote=${shareText}`;
  const twLink  = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(registerUrl)}`;
  const qrSrc   = `${QR_BASE}/?size=180x180&data=${encodeURIComponent(registerUrl)}&color=2C1810&bgcolor=F5F0E8&qzone=1`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-6">
      <h3 className="font-serif text-lg font-bold text-brand-earth mb-1">Share this event</h3>
      <p className="text-xs text-brand-muted mb-5">
        Share the registration link on social media or print the QR code on your flyer.
