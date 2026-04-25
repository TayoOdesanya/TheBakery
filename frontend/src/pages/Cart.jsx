import { useState } from 'react'
import { Trash2, Plus, Minus, CreditCard } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import axios from 'axios'
import { useCart } from '../context/CartContext'
import LoadingSpinner from '../components/LoadingSpinner'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const Cart = () => {
  const { 
    items, 
    tableNumber, 
    setTableNumber, 
    updateQuantity, 
    removeItem, 
    getTotal, 
    clearCart,
    isEmpty,
    getCartForCheckout
  } = useCart()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTableNumberChange = (e) => {
    const value = e.target.value
    if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 999)) {
      setTableNumber(value)
    }
  }

  const handleCheckout = async () => {
    if (!tableNumber || parseInt(tableNumber) <= 0) {
      setError('Please enter a valid table number')
      return
    }

    if (isEmpty) {
      setError('Your cart is empty')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check availability before checkout
      const availabilityResponse = await axios.post('/menu/check-availability', {
        items: getCartForCheckout()
      })

      if (!availabilityResponse.data.allAvailable) {
        const unavailableItems = availabilityResponse.data.items
          .filter(item => !item.available)
          .map(item => `Item ${item.menuItemId}: ${item.reason}`)
          .join(', ')
        
        setError(`Some items are no longer available: ${unavailableItems}`)
        return
      }

      // Create Stripe checkout session
      const response = await axios.post('/stripe/create-checkout-session', {
        items: getCartForCheckout(),
        tableNumber: parseInt(tableNumber)
      })

      const stripe = await stripePromise
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId
      })

      if (stripeError) {
        setError(stripeError.message)
      }

    } catch (error) {
      console.error('Checkout error:', error)
      setError(error.response?.data?.error || 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isEmpty) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some delicious items from our menu</p>
        <a href="/menu" className="btn-primary">
          Browse Menu
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Order</h1>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Table Number Input */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-2">
          Table Number *
        </label>
        <input
          id="tableNumber"
          type="number"
          min="1"
          max="999"
          value={tableNumber}
          onChange={handleTableNumberChange}
          placeholder="Enter your table number"
          className="input-field"
          required
        />
      </div>

      {/* Cart Items */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        {items.map((item) => (
          <div key={item.id} className="border-b border-gray-200 last:border-b-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-2">${parseFloat(item.price).toFixed(2)} each</p>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  
                  <span className="w-8 text-center font-semibold">
                    {item.quantity}
                  </span>
                  
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-4 p-1 text-error-600 hover:text-error-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary-600">
            ${getTotal().toFixed(2)}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          Table {tableNumber} • {items.length} item{items.length !== 1 ? 's' : ''}
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || !tableNumber || parseInt(tableNumber) <= 0}
          className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span>Proceed to Payment</span>
            </>
          )}
        </button>
      </div>

      {/* Clear Cart */}
      <div className="text-center">
        <button
          onClick={clearCart}
          className="text-gray-600 hover:text-error-600 text-sm"
        >
          Clear Cart
        </button>
      </div>
    </div>
  )
}

export default Cart