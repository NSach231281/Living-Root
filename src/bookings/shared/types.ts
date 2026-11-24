// ─────────────────────────────────────────────────────────────────────────────
// Living Roots · Bookings module — shared types (used by the browser AND /api)
// Keep this file free of browser-only or node-only imports.
// ─────────────────────────────────────────────────────────────────────────────

export type BookingType =
  | "event"               // 30-second form: one event, footfall-tier pricing (2026-11 rules)
  | "venue"               // one-time venue hire: one or more dated sessions, priced per hour
  | "subscription"        // recurring weekly classes, billed monthly
  | "night_subscription"  // Fri & Sat late-night monthly plan, priced per night
  | "custom";             // rep-entered line items (revenue share, corporate packages…)

export type Stage =
  | "enquiry"     // form submitted, nothing paid
  | "quoted"      // rep reviewed / sent the quote
  | "confirmed"   // advance received & verified → calendar blocked
  | "completed"   // event over (and reconciled)
  | "cancelled"
  | "lost";

export type Source = "social" | "website" | "rep" | "walk_in" | "referral" | "whatsapp" | "other";

export interface Session {
  date:  string;   // YYYY-MM-DD
  start: string;   // HH:MM (24h)
  end:   string;   // HH:MM — if <= start the session runs past midnight
}

export interface SubscriptionSpec {
  days:      number[];  // 0=Sun … 6=Sat
  start:     string;    // HH:MM
  end:       string;    // HH:MM
  startDate: string;    // YYYY-MM-DD
  months:    number;    // commitment length (1, 3, …)
}

export interface NightSpec {
  startMonth: string;   // YYYY-MM
  months:     number;
}

/** The 30-second booking form (type "event"). */
export interface EventSpec {
  date:        string;          // YYYY-MM-DD
  start:       string;          // HH:MM (24h)
  end:         string;          // HH:MM
  guestsTier:  0 | 1 | 2;       // 0 = under 25, 1 = 25–50, 2 = more than 50
  need:        "space" | "both" | "tix";  // space only · space + ticketing · ticketing only
  preMin:      number;          // set-up before, minutes (15-min steps)
  postMin:     number;          // wrap-up after, minutes
  firstTime:   boolean;
  oneTime:     boolean;         // false = wants subscription plans
  ticketPrice?:     number;
  ticketsExpected?: number;
}

export interface AddOnPick { id: string; qty?: number }

export interface CustomLine { label: string; detail?: string; qty: number; unit: string; rate: number }

/** Everything needed to price a booking. */
export interface QuoteInput {
  type:          BookingType;
  event?:        EventSpec;          // event
  sessions?:     Session[];          // venue
  subscription?: SubscriptionSpec;   // subscription
  nights?:       NightSpec;          // night_subscription
  customLines?:  CustomLine[];       // custom
  guests?:       number;
  addOns?:       AddOnPick[];
  clientGstin?:  string;             // decides IGST vs CGST+SGST
  // ── Rep-only overrides (ignored on public submissions) ──
  rateOverride?:     number;         // ₹/hr (venue) or ₹/session (subscription), pre-GST
  discountPct?:      number;
  discountFlat?:     number;         // ₹, pre-GST
  discountNote?:     string;
  advancePct?:       number;         // default from rate card
  waiveAddOns?:      string[];       // add-on ids shown as WAIVED
}

export interface QuoteLine {
  label:         string;
  detail?:       string;
  qty:           number;
  unit:          string;
  rate:          number;   // pre-GST
  standardRate?: number;   // pre-GST, for "you save"
  amount:        number;   // pre-GST
  waived?:       boolean;
  taxable?:      boolean;  // default true; deposits are false
}

export interface Installment {
  id:      string;
  label:   string;
  kind:    "advance" | "balance" | "monthly" | "deposit" | "other";
  amount:  number;          // ₹ incl. GST
  dueDate: string;          // YYYY-MM-DD ("" = on confirmation)
  reminderSentAt?: number;
}

export interface Quote {
  lines:          QuoteLine[];
  standardValue:  number;   // pre-GST at standard rates
  discount:       number;   // pre-GST (standard − taxable)
  taxable:        number;
  gstRate:        number;   // e.g. 0.18
  cgst:           number;
  sgst:           number;
  igst:           number;
  gst:            number;
  total:          number;   // incl. GST (excludes deposit)
  deposit:        number;   // refundable, no GST
  grandTotal:     number;   // total + deposit
  standardTotal:  number;   // standard value incl. GST
  savings:        number;   // incl. GST
  savingsPct:     number;
  advance:        number;   // first installment (incl. deposit if any)
  balance:        number;
  balanceDueDate: string;
  schedule:       Installment[];
  firstDate:      string;
  lastDate:       string;
  hours:          number;   // total booked hours
  sessionsCount:  number;
  notes:          string[];
  warnings:       string[];
}

export interface Payment {
  id:        string;
  amount:    number;
  utr:       string;          // UPI ref / RRN / cheque no.
  method:    "upi" | "bank_transfer" | "cash" | "card" | "other";
  paidOn:    string;          // YYYY-MM-DD
  source:    "client" | "rep" | "bank_statement";
  verified:  boolean;
  verifiedBy?: string;
  verifiedAt?: number;
  note?:     string;
  createdAt: number;
  pendingAlertAt?: number;   // last 9 PM "still not in the bank" alert
}

export interface PartnerBank {
  accountName?: string;
  accountNo?:   string;
  ifsc?:        string;
  bankName?:    string;
  upi?:         string;
  pan?:         string;
}

export interface Booking {
  id:          string;     // unguessable — used in the client link /b/:id
  ref:         string;     // short human ref, used as UPI note: LR-7K3Q9
  quoteNo:     string;     // LR/2026/NOV/004
  createdAt:   number;
  updatedAt:   number;
  stage:       Stage;
  source:      Source;
  sourceDetail?: string;   // utm / instagram / rep name …
  createdBy?:  string;     // staff email if rep-created
  assignedTo?: string;     // staff email

  // Client
  name:        string;
  phone:       string;
  email:       string;
  organisation?: string;
  gstin?:      string;
  clientType?: "individual" | "business" | "event_partner";
  partnerBank?: PartnerBank;   // optional, for event partners / revenue-share payouts
  heardFrom?:  string;
  marketingConsent?: boolean;

  // Event
  title:       string;       // e.g. "Healing Workshop"
  purpose:     string;       // workshop | yoga | shoot | …
  requests?:   string;
  input:       QuoteInput;
  quote:       Quote;
  isFirstTime?: boolean;

  // Money
  payments?:   Record<string, Payment>;
  notes?:      Record<string, { at: number; by: string; text: string }>;
  followUpOn?: string;       // YYYY-MM-DD
  calendarEventIds?: string[];
  confirmedAt?: number;
  completedAt?: number;
  reconciledAt?: number;
  cancelReason?: string;
  reminders?:  Record<string, number>;   // "<installmentId>:<kind>" → sent-at (ms); stops duplicate reminders
  notionPageId?: string;
  emailLog?:   Record<string, { at: number; kind: string; to: string; ok: boolean }>;
}

/** Derived money position — never stored, always computed from quote + payments. */
export interface MoneyStatus {
  verifiedPaid:   number;
  claimedPaid:    number;   // includes unverified client claims
  outstanding:    number;   // grandTotal − verifiedPaid
  pendingVerification: number;
  firstPaidOn?:   string;
  lastUtr?:       string;
  status: "unpaid" | "awaiting_verification" | "partial" | "paid" | "overpaid";
  installments: (Installment & { paid: number; due: number; state: "paid" | "partial" | "unpaid" | "overdue" })[];
  nextDue?: Installment & { due: number };
}

/** Public-safe view returned by /api/bookings?action=get */
export interface PublicBooking {
  id: string; ref: string; quoteNo: string; createdAt: number; stage: Stage;
  name: string; phone: string; email: string; organisation?: string; gstin?: string;
  title: string; purpose: string; requests?: string; input: QuoteInput; quote: Quote;
  money: MoneyStatus;
  payments: Pick<Payment, "amount" | "utr" | "paidOn" | "verified">[];
}

export interface BusyBlock { date: string; start: string; end: string; state: "booked" | "held"; label?: string }
