// ─────────────────────────────────────────────────────────────────────────────
// Default rate card — derived from Living Roots' 2026 quotations.
// Admins can edit every number from /crm/settings (stored in Firebase at
// crm/config/rateCard); these defaults are used until then.
// All rupee figures are PRE-GST unless the name ends in "Incl".
// ─────────────────────────────────────────────────────────────────────────────

export interface AddOnDef {
  id: string;
  label: string;
  detail?: string;
  price: number;                       // pre-GST
  unit: "flat" | "per_person" | "per_hour";
  publicVisible: boolean;              // offer on the public /book form?
}

export interface RateCard {
  gstRate: number;
  homeStateCode: string;               // "29" = Karnataka → CGST+SGST; other → IGST

  // 30-second form ("event") pricing — Nov 2026
  tierLabels: string[];                // footfall tiers
  tierHourly: number[];                // ₹/hr + GST per tier
  ticketingHourly: number;             // space + ticketing (and ticketing-only rental) ₹/hr
  ticketShareLrPct: number;            // Living Roots' share of ticket sales
  firstTimerPct: number;               // first-timer discount …
  offerStart: string;                  // … on weekdays, whole booking within these hours
  offerEnd: string;
  freeBufferMin: number;               // free set-up / wrap-up each side
  smallTotal: number;                  // totals below this pay a flat advance …
  smallAdvance: number;                // … of this much
  eventAdvancePct: number;             // otherwise this % of the total
  rescheduleFee: number;               // ₹ + GST per date change

  // Venue hire (per hour)
  standardHourly: number;              // list price shown as "standard"
  weekdayHourly: number;               // online / first-time rate Mon–Fri
  weekendHourly: number;               // online / first-time rate Sat–Sun
  longBookingHours: number;            // sessions this long or longer …
  longBookingDiscountPct: number;      // … get this extra discount
  minHours: number;
  openTime: string;                    // earliest bookable start (HH:MM)
  closeTime: string;                   // latest end for daytime bookings
  overtimeHourly: number;              // quoted in T&Cs

  // Subscriptions (recurring classes)
  subscriptionDiscountPct: number;     // off standard hourly
  subscription1MonthExtraPct: number;  // extra off for month-to-month
  subscription3MonthExtraPct: number;  // extra off for 3-month commitment
  subscriptionRoundInclTo: number;     // round monthly incl-GST price to ₹ …
  weeksPerMonth: number;               // "4 weeks × 2 days = 8 sessions"

  // Late-night plan
  nightRateIncl: number;               // ₹ per night incl. GST
  nightDays: number[];                 // 5 = Fri, 6 = Sat
  nightStart: string;
  nightEnd: string;
  nightDeposit: number;                // refundable, no GST

  // Payment terms
  advancePct: number;                  // venue default
  balanceDaysBefore: number;           // balance due N days before first session
  quoteValidDays: number;

  addOns: AddOnDef[];
  included: string[];                  // "included at no extra cost" list on the quote

  // Bank / UPI (shown on quote + pay page)
  upiVpa: string;
  upiName: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export const DEFAULT_RATE_CARD: RateCard = {
  gstRate: 0.18,
  tierLabels: ["Under 25", "25 to 50", "More than 50"],
  tierHourly: [2100, 3000, 3600],
  ticketingHourly: 1500,
  ticketShareLrPct: 40,
  firstTimerPct: 10,
  offerStart: "10:00",
  offerEnd: "22:00",
  freeBufferMin: 30,
  smallTotal: 5000,
  smallAdvance: 1000,
  eventAdvancePct: 40,
  rescheduleFee: 330,
  homeStateCode: "29",

  standardHourly: 2100,
  weekdayHourly: 1500,
  weekendHourly: 1800,
  longBookingHours: 6,
  longBookingDiscountPct: 10,
  minHours: 1,
  openTime: "06:00",
  closeTime: "23:00",
  overtimeHourly: 2100,

  subscriptionDiscountPct: 50,
  subscription1MonthExtraPct: 5,
  subscription3MonthExtraPct: 15,
  subscriptionRoundInclTo: 10,
  weeksPerMonth: 4,

  nightRateIncl: 3500,
  nightDays: [5, 6],
  nightStart: "23:00",
  nightEnd: "04:00",
  nightDeposit: 15000,

  advancePct: 50,
  balanceDaysBefore: 1,
  quoteValidDays: 7,

  addOns: [
    { id: "balcony",   label: "Balcony & special set-up", detail: "Balcony space, water, floor protection, drainage & clean-up", price: 6000, unit: "flat", publicVisible: true },
    { id: "snacks",    label: "Tea, coffee & snacks",      detail: "Per participant, per day",                                     price: 340,  unit: "per_person", publicVisible: true },
    { id: "setup_hr",  label: "Extra set-up / clean-up time", detail: "Beyond the free 30 minutes",                                price: 1000, unit: "per_hour", publicVisible: false },
  ],
  included: [
    "Sound system with speakers, Bluetooth and wired mics",
    "Projector with screen and HDMI / wireless connection",
    "High-speed WiFi and power points throughout",
    "Drinking water for all participants",
    "Whiteboard & flipchart with markers",
    "Chairs, tables and open floor space for mat work",
    "Housekeeping before and after",
    "30 minutes of free set-up time",
  ],

  upiVpa: "yespay.bizsbiz244828@yesbankltd",
  upiName: "SANS COLLECTIVE VENTURES",
  bankAccountName: "Living Root",
  bankName: "YES BANK",
  bankAccountNo: "041563700002444",
  bankIfsc: "YESB0000415",
  gstin: "29AFYFS3431G1ZF",
  address: "301, 14th Main, 15th Cross, 2nd Floor, JP Nagar 5th Phase, Bengaluru – 560078",
  phone: "+91 98450 54981",
  email: "livingrootspace@gmail.com",
  website: "livingroot.space",
};

/** Merge a stored (possibly partial / older) rate card over the defaults. */
export function withDefaults(stored?: Partial<RateCard> | null): RateCard {
  return { ...DEFAULT_RATE_CARD, ...(stored || {}), addOns: stored?.addOns?.length ? stored.addOns : DEFAULT_RATE_CARD.addOns, included: stored?.included?.length ? stored.included : DEFAULT_RATE_CARD.included };
}

export const PURPOSES = [
  "Workshop", "Yoga / wellness session", "Sound healing", "Dance / fitness class", "Music class",
  "Photo / video shoot", "Corporate training / offsite", "Meeting", "Birthday / celebration",
  "Community meetup", "Art / craft session", "Late-night event", "Other",
];
