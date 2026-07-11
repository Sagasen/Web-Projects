// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

import RequireAuth      from '../components/layout/RequireAuth'
import RequireAdminRole from '../components/layout/RequireAdminRole'

// Public
import CalendarPage  from '../pages/public/CalendarPage'
import LoginPage     from '../pages/public/LoginPage'
import SignupPage    from '../pages/public/SignupPage'

// Customer
import DashboardPage      from '../pages/customer/DashboardPage'
import BookingFormPage    from '../pages/customer/BookingFormPage'
import BookingSuccessPage from '../pages/customer/BookingSuccessPage'

// Admin
import AdminLoginPage       from '../pages/admin/AdminLoginPage'
import AdminDashboardPage   from '../pages/admin/AdminDashboardPage'
import AdminBookingsPage    from '../pages/admin/AdminBookingsPage'
import AdminCalendarPage    from '../pages/admin/AdminCalendarPage'
import AdminClosedDatesPage from '../pages/admin/AdminClosedDatesPage'

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── PUBLIC ── */}
      <Route path="/"       element={<CalendarPage />} />
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* /admin = halaman login admin (tidak ada link dari publik) */}
      <Route path="/admin" element={<AdminLoginPage />} />


      {/* ── CUSTOMER (wajib login) ── */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard"                 element={<DashboardPage />} />
        <Route path="/dashboard/booking"         element={<BookingFormPage />} />
        <Route path="/dashboard/booking-success" element={<BookingSuccessPage />} />
      </Route>


      {/* ── ADMIN (wajib login + role admin) ── */}
      <Route element={<RequireAdminRole />}>
        <Route path="/admin/dashboard"    element={<AdminDashboardPage />} />
        <Route path="/admin/bookings"     element={<AdminBookingsPage />} />
        <Route path="/admin/calendar"     element={<AdminCalendarPage />} />
        <Route path="/admin/closed-dates" element={<AdminClosedDatesPage />} />
      </Route>


      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
