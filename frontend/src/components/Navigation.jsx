import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Users, Settings, LogOut, ChefHat } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import TableStatus from './TableStatus'

const Navigation = () => {
  const location = useLocation()
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
  const { getItemCount } = useCart()

  const handleLogout = () => {
    logout()
  }

  const showTableStatus = isAuthenticated && isAdmin && 
    (location.pathname.startsWith('/kitchen') || location.pathname.startsWith('/admin'))

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link 
              to="/" 
              className="flex items-center space-x-2 font-bold text-xl text-primary-600"
            >
              <ChefHat className="h-8 w-8" />
              <span>Restaurant</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              {/* Customer Navigation */}
              {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/kitchen') && (
                <>
                  <Link
                    to="/menu"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/menu' || location.pathname === '/'
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                  >
                    Menu
                  </Link>
                  
                  <Link
                    to="/cart"
                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      location.pathname === '/cart'
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Cart</span>
                    {getItemCount() > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {getItemCount()}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* Admin Navigation */}
              {isAuthenticated && isAdmin && (
                <>
                  {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/kitchen') && (
                    <div className="border-l border-gray-300 h-6"></div>
                  )}
                  
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      location.pathname === '/admin/dashboard'
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>

                  <Link
                    to="/kitchen"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      location.pathname === '/kitchen'
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Kitchen</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-error-600 transition-colors flex items-center space-x-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}

              {/* Login Link for non-authenticated users */}
              {!isAuthenticated && (
                <Link
                  to="/admin/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Table Status Bar for Staff */}
      {showTableStatus && (
        <div className="bg-gray-50 border-b border-gray-200 py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TableStatus compact={true} />
          </div>
        </div>
      )}
    </>
  )
}

export default Navigation