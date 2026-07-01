import React, { useEffect, useState } from "react";
import { useParams, Link }             from "react-router-dom";
import { onValue, ref }                from "firebase/database";
import { db }                          from "../../firebase";
import {
  Calendar, Clock, MapPin, ArrowLeft, Copy, CheckCircle,
  MessageCircle, Loader2,
} from "lucide-react";
import BrandedTicket from "../../components/ui/BrandedTicket";
import { PageShell } from "../../components/ui/LoadingScreen";

type Step = "info" | "pay" | "done";

const API      = "";
const UPI_ID   = import.meta.env.VITE_UPI_ID   || "livingroot@yesbank";
const UPI_NAME = import.meta.env.VITE_UPI_NAME  || "Living Root Space";
const VENUE    = "Living Root, JP Nagar 5th Phase, Bengaluru";

export default function Register() {
  const { id } = useParams<{ id: string }>();

  const [event,        setEvent]        = useState<any>(null);
  const [step,         setStep]         = useState<Step>("info");
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [seats,        setSeats]        = useState(1);
  const [paymentRef,   setPaymentRef]   = useState("");
  const [copied,       setCopied]       = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [waSending,    setWaSending]    = useState(false);
  const [waSent,       setWaSent]       = useState(false);
  const [ticketRef,    setTicketRef]    = useState("");
  const [ticketStatus, setTicketStatus] = useState<"confirmed" | "pending_payment">("confirmed");

  useEffect(() => {
    if (!id) return;
    return onValue(ref(db, `/events/${id}`), snap => {
      if (snap.exists()) setEvent({ id, ...snap.val() });
    });
  }, [id]);

  if (!event) return (
    <PageShell>
      <div className="max-w-xl mx-auto px-6 py-24 text-center text-brand-muted">
        <Loader2 className="mx-auto animate-spin mb-4" size={28}/>
        Loading event…
      </div>
    </PageShell>
  );

  const total   = event.price * seats;
  const isFree  = event.price === 0;
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent(event.title)}`;

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitRegistration = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/register-event`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          eventId:    id,
          eventTitle: event.title,
          eventDate:  event.date,
          eventTime:  event.time,
          eventVenue: VENUE,
          eventPrice: event.price,
          name, email, phone, seats,
          paymentRef: isFree ? "" : paymentRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setTicketRef(data.ticketRef);
      setTicketStatus(data.status);
      setStep("done");
    } catch (err: any) {
      setError(err.message);
    }
