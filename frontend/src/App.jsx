import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Menu from './pages/Menu'
import AdminLogin from './pages/AdminLogin'
import BuyerLoginPage from './pages/BuyerLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import KitchenDashboard from './pages/KitchenDashboard'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import RegisterPage from './pages/RegisterPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'
import CookiePolicy from './pages/CookiePolicy'
import AllergenInfo from './pages/AllergenInfo'
import ReturnsPolicy from './pages/ReturnsPolicy'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<BuyerLoginPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register/:token" element={<RegisterPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/allergens" element={<AllergenInfo />} />
          <Route path="/returns" element={<ReturnsPolicy />} />

          {/* Buyer routes — require login */}
          <Route path="/" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />

          {/* Admin-only routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/kitchen" element={<ProtectedRoute adminOnly><KitchenDashboard /></ProtectedRoute>} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
