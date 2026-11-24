// ─────────────────────────────────────────────────────────────────────────────
// Bookings module — every route lives here. Plugged into src/App.tsx with
// {bookingRoutes()} inside <Routes>.
//
//   /book            30-second booking form, one question per screen (share on social media)
//   /b/:id           client's booking page: quote, UPI QR, "I've paid", calendar
//   /crm             staff CRM (Excel-like), /crm/calendar, /crm/reconcile, /crm/settings
//   /crm/new         rep creates an event booking (same 30-second flow)
//   /crm/new/advanced  rep form for subscriptions, late-night plans, custom packages
//   /crm/edit/:id    rep edits a quote (event bookings open the 30-second flow)
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Route } from "react-router-dom";
import BookForm from "./pages/BookForm";
import QuickBook from "./pages/QuickBook";
import ClientBooking from "./pages/ClientBooking";
import CrmLayout, { RequireStaff } from "./crm/CrmLayout";
import Bookings from "./crm/Bookings";
import CalendarView from "./crm/CalendarView";
import Reconcile from "./crm/Reconcile";
import Settings from "./crm/Settings";

export function bookingRoutes() {
  return (
    <>
      <Route path="/book" element={<QuickBook mode="public"/>}/>
      <Route path="/b/:id" element={<ClientBooking/>}/>
      <Route path="/crm/new" element={<RequireStaff><QuickBook mode="staff"/></RequireStaff>}/>
      <Route path="/crm/new/advanced" element={<RequireStaff><BookForm mode="staff"/></RequireStaff>}/>
      <Route path="/crm/quick-edit/:id" element={<RequireStaff><QuickBook mode="staff"/></RequireStaff>}/>
      <Route path="/crm/edit/:id" element={<RequireStaff><BookForm mode="staff"/></RequireStaff>}/>
      <Route path="/crm" element={<RequireStaff><CrmLayout/></RequireStaff>}>
        <Route index element={<Bookings/>}/>
        <Route path="calendar" element={<CalendarView/>}/>
        <Route path="reconcile" element={<Reconcile/>}/>
        <Route path="settings" element={<Settings/>}/>
      </Route>
    </>
  );
}
