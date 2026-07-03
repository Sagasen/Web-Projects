import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Providers
import { ToastProvider } from './context/ToastContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { CartProvider } from './context/CartContext'

// Protected Route wrappers
import { ProtectedCustomerRoute } from './components/ProtectedCustomerRoute'
import { ProtectedOwnerRoute } from './components/ProtectedOwnerRoute'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { AdminLayout } from './components/AdminLayout'

// Customer Pages
import { Katalog } from './pages/Katalog'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { Orders } from './pages/Orders'

// Admin Pages
import { AdminLogin } from './pages/admin/AdminLogin'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminProducts } from './pages/admin/AdminProducts'
import { AdminOrders } from './pages/admin/AdminOrders'
import { AdminKasir } from './pages/admin/AdminKasir'
import { AdminReport } from './pages/admin/AdminReport'

function App() {
  return (
    <ToastProvider>
      <CustomerAuthProvider>
        <AdminAuthProvider>
          <CartProvider>
            <Router>
              <Routes>
                {/* Customer Public Routes */}
                <Route path="/" element={<Katalog />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/cart" element={<Cart />} />

                {/* Customer Protected Routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedCustomerRoute>
                      <Checkout />
                    </ProtectedCustomerRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedCustomerRoute>
                      <Orders />
                    </ProtectedCustomerRoute>
                  }
                />

                {/* Admin Auth Route */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Admin Protected Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/products"
                  element={
                    <ProtectedAdminRoute>
                      <AdminLayout>
                        <AdminProducts />
                      </AdminLayout>
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <ProtectedAdminRoute>
                      <AdminLayout>
                        <AdminOrders />
                      </AdminLayout>
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/kasir"
                  element={
                    <ProtectedAdminRoute>
                      <AdminLayout>
                        <AdminKasir />
                      </AdminLayout>
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/report"
                  element={
                    <ProtectedOwnerRoute>
                      <AdminLayout>
                        <AdminReport />
                      </AdminLayout>
                    </ProtectedOwnerRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Katalog />} />
              </Routes>
            </Router>
          </CartProvider>
        </AdminAuthProvider>
      </CustomerAuthProvider>
    </ToastProvider>
  )
}

export default App
