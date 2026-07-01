export type UserRole = "admin" | "partner" | "customer" | "vendor" | "marketing";

export type SocialType = "Solo" | "Couple" | "Family" | "Student" | "Professional" | "Senior";

export interface LRUser {
  uid:       string;
  email:     string;
  name:      string;
  photoURL?: string;
  role:      UserRole;
  partnerId?: string;  // "nitin" | "shruthi" | "siva" | "anusha"
  tier?:     "primary" | "secondary" | "premium"; // for customers
  socialType?: SocialType;
  createdAt: number;
}

export interface Event {
  id:          string;
  title:       string;
  description: string;
  date:        string;
  time:        string;
  price:       number;
  originalPrice: number; // ser higher than price to show a strikethrough discount
  seatsTotal:  number;
  seatsLeft:   number;
  vibes:       string[];
  imageUrl:    string;
  audienceType: SocialType[];
  stream:      string; // kids | yoga | social | events_in | workshop etc.
  status:      "draft" | "live" | "sold_out" | "completed";
  createdBy:   string;
}

export interface Booking {
  id:          string;
  eventId:     string;
  eventTitle:  string;
  userId:      string;
  userName:    string;
  userEmail:   string;
  userPhone?:  string;
  seats:       number;
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "refunded";
  paymentRef?:   string;
  status:      "confirmed" | "pending" | "cancelled";
  bookedAt:    number;
  confirmedBy?: string;
}

export interface DailyEntry {
  date:     string;
  type:     "Rev" | "Exp";
  amount:   number;
  stream:   string;
  footfall?: number;
  loggedBy: string;
  note:     string;
}

export interface RevenueStream {
  id:    string;
  label: string;
  type:  "community" | "corporate";
  count: number;
  price: number;
  active: boolean;
  eventsPerMonth?: number;
}
