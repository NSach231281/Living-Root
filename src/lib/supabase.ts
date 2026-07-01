import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn("⚠️  Supabase env vars missing — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export interface EventRegistration {
  id:            string;
  event_id:      string;
  event_title:   string;
  event_date:    string;
  event_time:    string;
  event_venue:   string;
  event_price:   number;
  name:          string;
  email:         string;
  phone:         string;
  seats:         number;
  ticket_ref:    string;
  status:        "confirmed" | "pending_payment" | "cancelled";
  payment_ref?:  string;
  email_sent:    boolean;
  whatsapp_sent: boolean;
  created_at:    string;
  confirmed_at?: string;
}
