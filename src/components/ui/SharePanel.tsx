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
      <p className="text-xs text-brand-muted mb-5">Share the registration link on social media or print the QR code on your flyer.</p>

      <div className="grid grid-cols-4 gap-2 mb-6">
        
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-bold bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-all"
        >
          <MessageCircle size={20}/>
          <span>WhatsApp</span>
        </a>

        
          href={fbLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-bold bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-all"
        >
          <Facebook size={20}/>
          <span>Facebook</span>
        </a>

        
          href={twLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-bold bg-black/5 text-brand-earth hover:bg-black/10 transition-all"
        >
          <Twitter size={20}/>
          <span>Twitter / X</span>
        </a>

        <button
          onClick={copyLink}
          className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-bold transition-all ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-brand-sand text-brand-clay hover:bg-brand-border"
          }`}
        >
          {copied ? <Check size={20}/> : <Link2 size={20}/>}
          <span>{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </div>

      <div className="bg-brand-bone rounded-xl border border-brand-border p-3 flex items-center gap-2 mb-6">
        <input
          readOnly
          value={registerUrl}
          className="flex-1 bg-transparent text-xs text-brand-clay font-mono outline-none select-all"
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={copyLink}
          className="flex-shrink-0 text-xs font-bold text-brand-spice hover:text-brand-earth transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="border-t border-brand-border pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-3 text-center">
          QR Code — for flyers &amp; posters
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-brand-bone rounded-xl border border-brand-border">
            <img
              src={qrSrc}
              alt="Registration QR Code"
              width={150}
              height={150}
              className="block"
            />
          </div>
          <p className="text-[11px] text-brand-muted text-center max-w-xs">
            Print this on your event flyer. Customers scan, fill the form, and get their ticket by email.
          </p>
          
            href={qrSrc.replace("size=180x180", "size=400x400")}
            download={`${eventId}-qr.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-xs px-4 py-2"
          >
            ↓ Download QR (high-res)
          </a>
        </div>
      </div>
    </div>
  );
}
