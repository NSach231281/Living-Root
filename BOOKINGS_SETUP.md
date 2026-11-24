# 🌿 Bookings module — setup guide (≈ 45 minutes, ₹0)

Quotes → UPI advance → calendar → balance reminder → reconciliation, plus an Excel-style CRM.
Everything runs on what you already have (Vercel + Firebase) using free tiers only.

| Link | Who | What |
|---|---|---|
| `/book` | Anyone — also reachable from the **Book the space** button in the top bar, the round **Book** button on phones, and the homepage | 30-second form, one tap per question → instant quote, live availability |
| `/book?src=instagram` | Social posts | Same, tagged so the CRM shows where the lead came from |
| `/b/<id>` | The client (sent automatically) | Quote, UPI QR with amount pre-filled, "I've paid", calendar invite, PDF |
| `/crm` | Staff (any role in `PARTNER_GMAIL_MAP`) | CRM grid, booking drawer, Excel export |
| `/crm/new` | Reps | Same 30-second form for a client (plus email and lead source) |
| `/crm/new/advanced` | Reps | Subscriptions, late-night plans, custom packages, discounts / rate overrides |
| `/crm/calendar` · `/crm/reconcile` · `/crm/settings` | Staff · Staff · Admin | Calendar · bank-statement matching & finished-event check · rate card |

## How a booking flows

1. **Enquiry** — client (or rep) fills `/book`. Price is calculated from the rate card. Client gets the quote on WhatsApp (and email, if given); the team gets an email at livingrootspace@gmail.com + Telegram / WhatsApp ping.
2. **Advance** — client scans the QR on their page (amount + booking ref pre-filled), pays, and enters the UPI reference. **The booking is confirmed for them right away**: the date is blocked, they get the confirmation (WhatsApp + email with calendar invite), and the balance reminders are scheduled. The client never sees any "verification" step.
3. **Screenshot (team only)** — the team gets a "📸 collect screenshot" alert with a one-tap WhatsApp message asking the client for their payment screenshot. A rep checks it against the Yes Bank app and taps **Upload screenshot** on the booking in the CRM — that marks the payment checked. (No screenshot but you saw the money in the bank app? Tap **Checked in bank app**. Or upload the bank statement in *Reconcile*.)
4. **Balance** — at 8:30 AM on the due date (the day before the event, configurable) the client gets a "balance due today" email; overdue reminders follow every other day for a week. Reps also have a one-tap WhatsApp reminder.
5. **9 PM check** — every evening, any payment whose screenshot still isn't uploaded is sent to the team with one-tap links: *Ask for screenshot on WhatsApp* and *Upload in CRM*. If the money never arrived, the rep raises the payment with the client again.
6. **Reconciliation** — the morning after the event: fully paid → marked **Completed**; unpaid → flagged in the daily digest and *Reconcile → Finished events* until settled.

> Why "verify" is a tap and not automatic: your QR is a static Yes Bank merchant QR, which doesn't notify any app when money arrives. If you later get a payment gateway (Razorpay etc.) with webhooks, step 3 can become automatic.

---

## Step 1 — Push the code (2 min)
```bash
git add -A && git commit -m "Bookings module" && git push
```
Vercel redeploys by itself.

## Step 2 — Firebase service account (5 min) — *required*
The server needs this to save bookings.
1. Firebase console → ⚙️ **Project settings → Service accounts → Generate new private key** → downloads a `.json`.
2. Vercel → your project → **Settings → Environment Variables** → add `FIREBASE_SERVICE_ACCOUNT` = *paste the entire JSON file contents*.

## Step 3 — Email from livingrootspace@gmail.com (5 min) — *required*
1. Sign in to that Gmail → <https://myaccount.google.com/security> → turn on **2-Step Verification** (if not already).
2. Open <https://myaccount.google.com/apppasswords> → create one named "Living Roots app" → copy the 16 letters.
3. Vercel env vars:
   - `GMAIL_USER` = `livingrootspace@gmail.com`
   - `GMAIL_APP_PASSWORD` = the 16 letters
   - `STAFF_EMAILS` = team emails for alerts. Defaults to `livingrootspace@gmail.com`; add more separated by commas.

Gmail allows ~500 emails/day — plenty. (Already use Resend? Set `RESEND_API_KEY` + `FROM_EMAIL` instead.)

## Step 4 — Publish the new database rules (2 min) — *required*
Firebase console → **Realtime Database → Rules** → paste all of `database.rules.json` → **Publish**.

This adds the `crm` area (staff read, server-only write) and fixes an old gap where any signed-in user could set their own role to `admin`.
**When you add a team member** to `PARTNER_GMAIL_MAP` in `src/contexts/AuthContext.tsx`, add the same email + role to the `users → $uid → role` rule too.

## Step 5 — Remaining Vercel variables (3 min)
| Variable | Value |
|---|---|
| `APP_URL` | `https://livingrootspace.com` (your live domain, used in links) |
| `CRON_SECRET` | any long random text — protects the daily job |
| `CALENDAR_FEED_KEY` | any long random text — the password in your calendar feed URL |

Then **Deployments → ⋯ → Redeploy**.

## Step 6 — Team alerts on Telegram (5 min) — *recommended, so nothing slips*
1. In Telegram, message **@BotFather** → `/newbot` → copy the token → Vercel `TELEGRAM_BOT_TOKEN`.
2. Create a group "Living Roots bookings", add your team and the bot, send any message in it.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `"chat":{"id":-100…}` → Vercel `TELEGRAM_CHAT_ID` = that number (with the minus sign). Redeploy.

Every new enquiry, payment-to-verify, and the 8:30 AM digest now pings the group.

## Step 7 — Calendar (5 min)
**Google Calendar / Notion Calendar / iPhone (zero setup):**
Google Calendar → *Other calendars* **+** → **From URL** →
`https://livingrootspace.com/api/bookings?action=ics&key=<CALENDAR_FEED_KEY>`
Confirmed bookings show normally, on-hold ones as `[HOLD]`. Google refreshes subscribed calendars every few hours. Notion Calendar shows it once it's in your Google account.

**Notion database (instant, optional):**
1. <https://www.notion.so/my-integrations> → **New integration** → copy the secret → Vercel `NOTION_TOKEN`.
2. In Notion create a full-page **Database** (Calendar view) → ⋯ → **Connections** → add your integration.
3. Copy the database ID from its URL (`notion.so/<workspace>/<THIS-32-CHAR-ID>?v=…`) → Vercel `NOTION_DATABASE_ID`. Redeploy.
The app adds its columns (When, Status, Payment, Client, Phone, Total, Outstanding, Ref, Link) by itself and keeps each booking's page up to date.

## Step 8 — WhatsApp messages to clients (≈30 min + Meta's approval, ~₹15–30/month)
Quotes, payment receipts, confirmations and **balance reminders the day before the event** go out on WhatsApp through Meta's own WhatsApp Cloud API (no middleman fees; Meta charges about ₹0.15 per message).

1. Get a phone number for the business that is **not** active on the normal WhatsApp / WhatsApp Business app (a new SIM, or move your current number — moving it removes it from the app).
2. Go to <https://business.facebook.com> → create/choose your business → **WhatsApp Manager** → add the number and verify it by SMS.
3. In <https://developers.facebook.com> → **My Apps → Create app → Business** → add the **WhatsApp** product → connect it to your WhatsApp account. Note the **Phone number ID**.
4. Business settings → **System users** → add one (Admin) → **Generate token** for the app with permissions `whatsapp_business_messaging` and `whatsapp_business_management`, expiry **Never**. Copy the token.
5. Add a payment method in WhatsApp Manager (needed for per-message billing).
6. WhatsApp Manager → **Message templates → Create** each template below — category **Utility**, language **English**, name exactly as shown, body exactly as shown:

| Name | Body |
|---|---|
| `lr_quote` | Hi {{1}}, thank you for choosing Living Roots! Your quote for {{2}} on {{3}} is ₹{{4}} including GST. Pay the advance of ₹{{5}} to block your date: {{6}} |
| `lr_payment_received` | Hi {{1}}, thank you! We have received your payment of ₹{{2}} for your Living Roots booking {{3}}. |
| `lr_booking_confirmed` | Hi {{1}}, your booking {{2}} at Living Roots on {{3}} is confirmed. Paid so far: ₹{{4}}. Balance: ₹{{5}}, due {{6}}. Booking details: {{7}} |
| `lr_balance_due` | Hi {{1}}, a reminder from Living Roots: the balance of ₹{{2}} for {{3}} on {{4}} is due today. Pay here: {{5}} |
| `lr_payment_overdue` | Hi {{1}}, the payment of ₹{{2}} for your Living Roots booking {{3}} was due on {{4}} and is still pending. Pay here: {{5}} |
| `lr_team_alert` | Living Roots bookings: {{1}} |

7. Vercel env vars: `WHATSAPP_TOKEN` = the token, `WHATSAPP_PHONE_NUMBER_ID` = the ID, and optionally `STAFF_WHATSAPP` = team numbers (comma-separated) for alerts. Redeploy.

Until the templates are approved, everything else keeps working — reps can still send reminders with the one-tap WhatsApp buttons in the CRM.

## Step 9 — Test it (10 min)
1. Open `/book` on your phone, book a slot for next week with your own email.
2. Check: quote email arrives; team email/Telegram ping arrives.
3. On the booking page, tap **I've paid** with any 12-digit number as the UTR → you get "payment received", the team gets "verify". In `/crm` tap **Verify** → booking turns Confirmed, confirmation email + calendar invite arrive.
4. `/crm/settings` → **Preview** the daily check. Then cancel the test booking in the drawer.
5. Put `https://livingrootspace.com/book?src=instagram` in your Instagram bio (the share icon in `/crm` gives tagged links + a QR for posters).

---

## Pricing (30-second form)
- **Space only:** ₹2,100/hr (under 25 guests) · ₹3,000/hr (25–50) · ₹3,600/hr (50+), plus GST.
- **Space + ticketing:** ₹1,500/hr + GST; the client keeps 60% of ticket sales, Living Roots 40%.
- **Ticketing only:** no hire fee for events of 1 hr or less; longer events pay ₹1,500/hr space rental (no discount).
- **First-timer offer:** 10% off on Mon–Fri when the whole booking (incl. set-up) is between 10 am and 10 pm — shown on the quote as a separate line.
- **Set-up / wrap-up:** chosen in 15-minute steps; the first 30 min before and after are free (only offered when the slot next to it is empty); extra time is charged at the event's hourly rate.
- **Advance:** totals under ₹5,000 pay ₹1,000; otherwise 40%. Balance due the day before. Date change to an open slot: ₹330 + GST.
- "Regularly" flags the lead for a rep to share subscription plans (current plans unchanged).

## Changing prices
`/crm/settings` (admin) → rate card. Defaults come from your 2026 quotes: ₹2,100/hr standard, ₹1,800 weekend / ₹1,500 weekday first-time rate, 10% off 6+ hours, 50% subscription discount (+5% month-to-month / +15% for 3 months), late-night ₹3,500/night incl. GST with ₹15,000 deposit, 50% advance, balance a day before. Reps can override the rate, add % or ₹ discounts, waive add-ons and change the advance % per booking.

Online quote numbers start at **LR/2026/NOV/101** so they never clash with your hand-made ones.

## Running locally
```bash
npm install
npm run demo        # full app with a fake in-memory database, no keys needed → http://localhost:3000/book and /crm
                    # emails are written to .dev-outbox/ instead of being sent
# or, against real Firebase: put the Vercel variables in .env.local, then
npm run dev:api  &  npm run dev
```

## Where the code is
Everything is in **`src/bookings/`** (plus two thin files in `api/`):
```
src/bookings/
  routes.tsx          all routes, plugged into src/App.tsx with {bookingRoutes()}
  shared/             pricing engine, rate card, types, dates, .ics — used by browser AND server
  pages/BookForm.tsx  /book, /crm/new, /crm/edit/:id
  pages/ClientBooking.tsx  /b/:id
  crm/                CRM grid, drawer, calendar, reconcile, settings, Excel export
  client/             browser API helper + small UI pieces
  server/             Firebase Admin, emails, Telegram, Notion, business logic, daily job
api/bookings.ts       /api/bookings?action=…  (one function for everything)
api/cron-daily.ts     the 8:30 AM job (scheduled in vercel.json)
```

## Free-tier limits (you're far below them)
Firebase Realtime DB: 1 GB stored, 10 GB/month transfer · Vercel Hobby: 100 GB bandwidth, daily cron jobs (we use two: 8:30 AM and 9 PM) · Gmail: ~500 emails/day · Telegram & Notion API: free.
Note: Vercel's Hobby plan is meant for non-commercial use; if Vercel ever asks, Pro is $20/month, or the same code can move to Netlify/Cloudflare free tiers with small changes.
