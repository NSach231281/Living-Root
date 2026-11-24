# Bookings module

Quotes → UPI payments → calendar → reminders → reconciliation → CRM.
**Setup & how it works: see [/BOOKINGS_SETUP.md](../../BOOKINGS_SETUP.md).**

```
routes.tsx      all routes (/book, /b/:id, /crm/*), plugged into src/App.tsx
shared/         pricing engine, rate card, types, dates, .ics (browser + server)
pages/          BookForm (/book, /crm/new, /crm/edit/:id), ClientBooking (/b/:id)
crm/            CRM grid, booking drawer, calendar, reconcile, settings, Excel export
client/         browser API helper + UI pieces
server/         Firebase Admin, email/Telegram/Notion, business logic, daily job, dev mock
```
Server entry points: `api/bookings.ts`, `api/cron-daily.ts`.
