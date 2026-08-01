import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import RegisterBusiness from './pages/RegisterBusiness'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Products from './pages/Products'
import Employees from './pages/Employees'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/register-business"
        element={
          <ProtectedRoute requireOnboarding={false}>
            <RegisterBusiness />
          </ProtectedRoute>
        }
      />

      {[
        { path: '/', element: <Dashboard /> },
        { path: '/billing', element: <Billing /> },
        { path: '/products', element: <Products /> },
        { path: '/employees', element: <Employees /> },
        { path: '/customers', element: <Customers /> },
        { path: '/expenses', element: <Expenses /> },
        { path: '/reports', element: <Reports /> },
        { path: '/settings', element: <Settings /> },
      ].map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <Layout>{element}</Layout>
            </ProtectedRoute>
          }
        />
      ))}
    </Routes>
  )
}
