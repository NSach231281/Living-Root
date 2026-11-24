import React, { useState } from "react";
import { Copy, CheckCircle, MessageCircle } from "lucide-react";

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  description?: string;
}

/** Share an event's registration link (copy / WhatsApp / native share). */
export default function SharePanel({ eventId, eventTitle, eventDate, eventTime }: Props) {
  const [copied, setCopied] = useState(false);
  const url  = `${window.location.origin}/register/${eventId}`;
  const text = `${eventTitle}${eventDate ? ` · ${eventDate}` : ""}${eventTime ? ` ${eventTime}` : ""} at Living Roots 🌿\nRegister: ${url}`;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const native = () => (navigator as any).share?.({ title: eventTitle, text, url });
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={copy} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-border text-sm bg-white">
        {copied ? <CheckCircle size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy link"}
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
         className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366] text-white text-sm">
        <MessageCircle size={14}/> WhatsApp
      </a>
      {"share" in navigator && (
        <button onClick={native} className="px-3 py-2 rounded-xl border border-brand-border text-sm bg-white">Share…</button>
      )}
    </div>
  );
}
