# 🌿 Living Root — Unified App

Customer booking + partner ops + admin ERP for livingrootspace.com

---

## ⚡ Deploy in 30 minutes — Step by step

### Step 1 — Create GitHub repo

1. Go to github.com → New repository
2. Name it `livingroot`
3. Keep it private
4. **Don't** add README or .gitignore (we have them)
5. Copy the repo URL (e.g. `https://github.com/yourname/livingroot.git`)

### Step 2 — Push this code

Open Terminal on your laptop and run:

```bash
cd /path/to/this/folder    # navigate to where you extracted the zip
git init
git add .
git commit -m "Initial Living Root app"
git remote add origin https://github.com/yourname/livingroot.git
git branch -M main
git push -u origin main
```

### Step 3 — Deploy on Vercel

1. Go to **vercel.com** → Sign in with GitHub
2. Click **Add New → Project**
3. Import your `livingroot` repository
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy** (first deploy without env vars is fine)

### Step 4 — Add environment variables on Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyDfyP4YO-effehhGBOyf66K45h9ZgB_Mx4` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `living-root.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://living-root-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `VITE_FIREBASE_PROJECT_ID` | `living-root` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `living-root.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1036433941276` |
| `VITE_FIREBASE_APP_ID` | `1:1036433941276:web:180fcd19c61230385490d9` |
| `VITE_GEMINI_API_KEY` | `your_gemini_key_here` |
| `VITE_UPI_ID` | `your_upi_id@yesbank` |
| `VITE_UPI_NAME` | `Living Root Space` |

Then click **Redeploy**.

### Step 5 — Connect your domain

In Vercel → **Settings → Domains** → Add `livingrootspace.com`

Vercel shows you DNS records. Add them in your domain registrar's DNS panel:
- Type: `A` → `76.76.21.21`
- Type: `CNAME` → `cname.vercel-dns.com`

Takes 5–30 minutes to propagate.

### Step 6 — Add your domain to Firebase Auth

In Firebase Console → **Authentication → Settings → Authorized domains** → Add `livingrootspace.com`

This is required for Google OAuth to work on your domain.

### Step 7 — Apply Firebase security rules

In Firebase Console → **Realtime Database → Rules** → paste the contents of `database.rules.json` → Publish.

---

## 🔑 Who gets access to what

Open `src/contexts/AuthContext.tsx` and fill in the `PARTNER_GMAIL_MAP`:

```typescript
const PARTNER_GMAIL_MAP: Record<string, ...> = {
  "nitin_actual@gmail.com":   { role: "admin",   partnerId: "nitin"   },
  "shruthi_actual@gmail.com": { role: "partner",  partnerId: "shruthi" },
  "siva_actual@gmail.com":    { role: "partner",  partnerId: "siva"    },
  "anusha_actual@gmail.com":  { role: "partner",  partnerId: "anusha"  },
};
```

Replace with the actual Gmail addresses each person uses to sign in with Google.
Commit and push — Vercel redeploys automatically.

---

## 📍 App URLs

| URL | Who sees it |
|-----|-------------|
| `livingrootspace.com` | Public — everyone |
| `livingrootspace.com/events` | Public event listing |
| `livingrootspace.com/events/:id` | Event detail + booking |
| `livingrootspace.com/login` | Sign in with Google |
| `livingrootspace.com/my` | Customer — my bookings |
| `livingrootspace.com/partner` | Shruthi, Siva, Anusha |
| `livingrootspace.com/admin` | Nitin only |

---

## 📅 Creating your first event

1. Sign in as Nitin → goes to `/admin`
2. Click **Events** in sidebar
3. Click **New event**
4. Fill title, date, time, price, seats, vibes
5. Set status to **Live**
6. Save → event appears immediately on `/events`

---

## 💳 Payment flow (Yes Bank UPI)

Until a payment gateway is integrated:
1. Customer books → enters seats
2. Sees your UPI ID to pay
3. Enters UTR/transaction number after payment
4. Booking goes to `pending` status
5. Nitin sees it in **Admin → Events → Bookings**
6. Nitin verifies UTR and clicks **Confirm**
7. Customer's booking shows as `confirmed`

To update your UPI ID: change `VITE_UPI_ID` in Vercel environment variables.

---

## 🏗️ What's built

✅ Public event discovery + booking (UPI payment flow)
✅ Google OAuth sign-in
✅ Role-based routing (customer / partner / admin)
✅ Customer dashboard (my bookings)
✅ Partner ops — revenue plan, ladder calendar, daily log, collaborators
✅ Admin overview with pending payment alerts
✅ Admin event management (CRUD, publish/draft, approve bookings)
✅ Admin financials (P&L, expense log, charts)
✅ Admin analytics (footfall, bookings, revenue by stream)
✅ Admin feedback review (from partners)
✅ Admin user management (roles, customer tiers)
✅ Firebase security rules (proper access control)

## 🔜 Phase 2 (next 2 weeks)

- [ ] Customer tier system (Primary / Secondary / Premium benefits)
- [ ] Razorpay or Yes Bank payment gateway integration
- [ ] Email confirmations (Resend)
- [ ] Vendor / collaborator portal
- [ ] WhatsApp booking notifications
- [ ] Gemini AI event recommendations
- [ ] Financial model scenario modeller (from Excel V3)
- [ ] Subscription memberships

---

## 🛠️ Local development

```bash
npm install
cp .env.example .env.local
# Fill in your values in .env.local
npm run dev
# Open http://localhost:3000
```
