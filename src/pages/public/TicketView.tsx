import React, { useEffect, useState }  from "react";
import { useParams, Link }             from "react-router-dom";
import { supabase }                    from "../../lib/supabase";
import type { EventRegistration }      from "../../lib/supabase";
import BrandedTicket                   from "../../components/ui/BrandedTicket";
import { PageShell }                   from "../../components/ui/LoadingScreen";
import { Loader2, AlertCircle }        from "lucide-react";

export default function TicketView() {
  const { ref: ticketRef }    = useParams<{ ref: string }>();
  const [reg, setReg]         = useState<EventRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ticketRef) return;
    (async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("ticket_ref", ticketRef)
        .single();

      if (error || !data) setNotFound(true);
      else                 setReg(data as EventRegistration);
      setLoading(false);
    })();
  }, [ticketRef]);

  return (
    <PageShell>
      <div className="max-w-xl mx-auto px-5 py-10">

        {loading && (
          <div className="flex flex-col items-center gap-4 py-20 text-brand-muted">
            <Loader2 size={32} className="animate-spin"/>
            <p>Verifying ticket…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="card p-8 text-center">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-3"/>
            <h2 className="font-serif text-xl font-bold text-brand-earth mb-2">Ticket not found</h2>
            <p className="text-brand-clay text-sm mb-6">
              No ticket found for ref <span className="font-mono font-bold text-brand-spice">{ticketRef}</span>.
              Please check the QR code or contact Living Root.
            </p>
            <Link to="/events" className="btn-primary text-sm">Browse events</Link>
          </div>
        )}

        {!loading && reg && (
          <>
            {reg.status === "confirmed" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Valid ticket — entry confirmed</p>
                  <p className="text-emerald-700 text-xs">
                    Registered on {new Date(reg.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric"
                    })}
                  </p>
                </div>
              </div>
            )}

            {reg.status === "pending_payment" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                <div>
                  <p className="font-bold text-amber-800 text-sm">Payment pending verification</p>
                  <p className="text-amber-700 text-xs">Do not allow entry until payment is confirmed by admin.</p>
                </div>
              </div>
            )}

            <BrandedTicket
              name={reg.name}
              eventTitle={reg.event_title}
              eventDate={reg.event_date}
              eventTime={reg.event_time}
              eventVenue={reg.event_venue}
              seats={reg.seats}
              ticketRef={reg.ticket_ref}
              status={reg.status}
            />

            <div className="mt-6 text-center">
              <Link to="/events" className="text-sm text-brand-muted hover:text-brand-spice transition-colors">
                Browse more events at Living Root →
              </Link>
            </div>
          </>
        )}

      </div>
    </PageShell>
  );
}
