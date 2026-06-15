import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Public pages
import Landing     from "./pages/public/Landing";
import Events      from "./pages/public/Events";
import EventDetail from "./pages/public/EventDetail";
import Login       from "./pages/Login";

// Customer pages
import CustomerDashboard from "./pages/customer/Dashboard";

// Partner pages
import PartnerLayout   from "./pages/partner/Layout";
import PartnerRevenue  from "./pages/partner/Revenue";
import PartnerCalendar from "./pages/partner/Calendar";
import PartnerDaily    from "./pages/partner/Daily";
import PartnerCollabs  from "./pages/partner/Collabs";

// Admin pages
import AdminLayout     from "./pages/admin/Layout";
import AdminOverview   from "./pages/admin/Overview";
import AdminFinancials from "./pages/admin/Financials";
import AdminAnalytics  from "./pages/admin/Analytics";
import AdminFeedback   from "./pages/admin/Feedback";
import AdminEvents     from "./pages/admin/Events";
import AdminUsers      from "./pages/admin/Users";
import AdminAssign     from "./pages/admin/Assign";

// Shared
import LoadingScreen from "./components/ui/LoadingScreen";

// ─── Route guards ─────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePartner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role !== "partner" && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

// After login, route to the right place based on role
function PostLoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role === "admin")   return <Navigate to="/admin"   replace />;
  if (user.role === "partner") return <Navigate to="/partner" replace />;
  return <Navigate to="/my" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Landing />} />
          <Route path="/events"   element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/me"       element={<PostLoginRedirect />} />

          {/* Customer */}
          <Route path="/my" element={<RequireAuth><CustomerDashboard /></RequireAuth>} />

          {/* Partner */}
          <Route path="/partner" element={<RequirePartner><PartnerLayout /></RequirePartner>}>
            <Route index             element={<Navigate to="revenue" replace />} />
            <Route path="revenue"    element={<PartnerRevenue />} />
            <Route path="calendar"   element={<PartnerCalendar />} />
            <Route path="daily"      element={<PartnerDaily />} />
            <Route path="collabs"    element={<PartnerCollabs />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index               element={<Navigate to="overview" replace />} />
            <Route path="overview"     element={<AdminOverview />} />
            <Route path="events"       element={<AdminEvents />} />
            <Route path="financials"   element={<AdminFinancials />} />
            <Route path="analytics"    element={<AdminAnalytics />} />
            <Route path="feedback"     element={<AdminFeedback />} />
            <Route path="users"        element={<AdminUsers />} />
            <Route path="assign"       element={<AdminAssign />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
