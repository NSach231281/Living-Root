import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn("⚠️  Supabase env vars missing — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

// Placeholder values keep the rest of the app working if these env vars are missing
// (createClient throws on an empty URL, which used to blank the whole site).
export const supabase = createClient(SUPABASE_URL || "https://placeholder.supabase.co", SUPABASE_ANON || "placeholder-anon-key");

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
