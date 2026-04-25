import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import axios from 'axios'
import { ShoppingCart, CreditCard, User, Phone, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const Checkout = () => {
  const navigate = useNavigate()
  const { items, getTotal, tableNumber, specialInstructions, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: ''
  })

  // Calculate total
  const total = getTotal()

  const handleCheckout = async (e) => {
    e.preventDefault()
    
    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    if (!customerInfo.name) {
      setError('Please enter your name')
      return
    }

    if (!tableNumber) {
      setError('Please enter a table number')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create checkout session with special instructions
      const response = await axios.post('http://localhost:3001/api/stripe/create-checkout-session', {
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price)
        })),
        tableNumber: parseInt(tableNumber),
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        specialInstructions: specialInstructions.trim() || null
      })

      const stripe = await stripePromise
      
      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId
      })

      if (stripeError) {
        setError(stripeError.message)
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.response?.data?.error || 'Failed to process checkout')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some items to your cart to continue</p>
        <button 
          onClick={() => navigate('/menu')}
          className="btn-primary"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center text-gray-700">
                <span className="font-medium">Table Number:</span>
                <span className="ml-2 text-lg font-bold text-primary-600">
                  {tableNumber}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">£{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Display Special Instructions if provided */}
            {specialInstructions && (
              <div className="border-t border-b py-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Special Instructions:</p>
                    <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-2 whitespace-pre-wrap">
                      {specialInstructions}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information & Payment */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Information</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCheckout} className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4 mb-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="pl-10 input-field"
                    placeholder="Your name"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="pl-10 input-field"
                    placeholder="07123 456789"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-blue-900 mb-1">Secure Payment</p>
                  <p>You'll be redirected to Stripe's secure payment page to complete your order.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary flex items-center justify-center space-x-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Proceed to Payment (£{total.toFixed(2)})</span>
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Powered by Stripe • Your payment information is secure
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Checkout