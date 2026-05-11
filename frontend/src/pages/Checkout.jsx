import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShoppingCart, Truck, Package, AlertCircle, CreditCard, Clock, ChefHat } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import Footer from '../components/Footer'

const Checkout = () => {
  const navigate = useNavigate()
  const {
    items, fulfillmentType,
    shippingTier, setShippingTier,
    shippingCost, setShippingCost,
    deliveryDetails, setDeliveryDetails,
    specialInstructions,
    getSubtotal, getTotal, getTotalWeight, getCartForCheckout, clearCart
  } = useCart()
  const { user } = useAuth()

  const [shippingRates, setShippingRates] = useState([])
  const [contactName, setContactName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!fulfillmentType && items.length > 0) navigate('/menu')
  }, [fulfillmentType, items, navigate])

  useEffect(() => {
    if (fulfillmentType === 'delivery') {
      axios.get('/api/shipping/rates')
        .then(res => setShippingRates(res.data.rates || []))
        .catch(() => setError('Failed to load shipping options. Please go back and try again.'))
    }
  }, [fulfillmentType])

  const calcTierPrice = (tier) => {
    if (!tier?.rates?.length) return null
    const totalWeight = getTotalWeight()
    const rate = tier.rates.find(r => totalWeight <= r.max_grams) ?? tier.rates[tier.rates.length - 1]
    return rate.price
  }

  const handleTierSelect = (tier) => {
    setShippingTier(tier.tier)
    setShippingCost(calcTierPrice(tier) ?? 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (fulfillmentType === 'collection' && !contactName.trim()) {
      setError('Please enter your name for collection')
      return
    }

    if (fulfillmentType === 'delivery') {
      if (!shippingTier) { setError('Please select a shipping option'); return }
      if (!deliveryDetails.name.trim()) { setError('Please enter the recipient name'); return }
      if (!deliveryDetails.phone.trim()) { setError('Please enter a delivery phone number'); return }
      if (!deliveryDetails.addressLine1.trim()) { setError('Please enter the delivery address'); return }
      if (!deliveryDetails.city.trim()) { setError('Please enter the city'); return }
      if (!deliveryDetails.postcode.trim()) { setError('Please enter the postcode'); return }
      if (getSubtotal() < 10) { setError('Minimum order for delivery is £10.00'); return }
    }

    setLoading(true)

    try {
      const orderData = {
        items: getCartForCheckout(),
        fulfillmentType,
        customerName: fulfillmentType === 'delivery' ? deliveryDetails.name : contactName,
        customerPhone: fulfillmentType === 'delivery' ? deliveryDetails.phone : (user?.phone || ''),
        specialInstructions: specialInstructions.trim() || null,
      }

      if (fulfillmentType === 'delivery') {
        Object.assign(orderData, {
          shippingTier,
          deliveryName: deliveryDetails.name,
          deliveryPhone: deliveryDetails.phone,
          deliveryAddressLine1: deliveryDetails.addressLine1,
          deliveryAddressLine2: deliveryDetails.addressLine2 || null,
          deliveryCity: deliveryDetails.city,
          deliveryPostcode: deliveryDetails.postcode,
        })
      }

      const { data: orderRes } = await axios.post('/api/orders', orderData)
      const orderId = orderRes.order?.id
      if (!orderId) throw new Error('Order creation failed')

      const { data: completeRes } = await axios.post(`/api/orders/${orderId}/complete`, {
        items: getCartForCheckout(),
        paymentMethod: 'card',
      })

      clearCart()
      navigate('/order-success', { state: { order: completeRes.order } })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process your order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const subtotal = getSubtotal()
  const total = getTotal()
  const isDelivery = fulfillmentType === 'delivery'
  const canSubmit = !loading && (isDelivery ? !!shippingTier : true)

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some items to your cart to continue</p>
        <button onClick={() => navigate('/menu')} className="btn-primary">Browse Menu</button>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-amber-600 hover:text-amber-700 transition-colors">
            <ChefHat className="h-7 w-7" />
            <span>The Bakery</span>
          </Link>
          <Link to="/menu" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to menu
          </Link>
        </div>
      </header>

    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Left: Order Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
              {isDelivery
                ? <><Truck className="h-5 w-5 text-blue-600" /><span className="font-medium text-blue-700">Delivery</span></>
                : <><Package className="h-5 w-5 text-green-600" /><span className="font-medium text-green-700">Collection</span></>
              }
            </div>

            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">× {item.quantity}</p>
                  </div>
                  <p className="font-semibold">£{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {specialInstructions && (
              <div className="border-t border-b py-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold mb-1">Special Instructions:</p>
                    <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-2 whitespace-pre-wrap">
                      {specialInstructions}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              {isDelivery && shippingCost > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>£{shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary-600">£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Shipping / Address / Contact */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Shipping tier selector */}
            {isDelivery && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Shipping Option</h2>
                {shippingRates.length === 0 ? (
                  <div className="text-gray-500 text-sm">Loading shipping options…</div>
                ) : (
                  <div className="space-y-3">
                    {shippingRates.map(tier => {
                      const price = calcTierPrice(tier)
                      const selected = shippingTier === tier.tier
                      return (
                        <button
                          key={tier.tier}
                          type="button"
                          onClick={() => handleTierSelect(tier)}
                          className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                            selected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-blue-500' : 'border-gray-300'}`}>
                                  {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <p className="font-semibold text-gray-900">{tier.display_name}</p>
                              </div>
                              <p className="text-sm text-gray-600 mt-1 ml-6">{tier.estimated_days}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 ml-6">
                                <Clock className="h-3 w-3" />
                                Order by {tier.cutoff_hour}:00 to qualify
                              </div>
                            </div>
                            {price != null && (
                              <span className={`font-bold ml-4 text-lg ${selected ? 'text-blue-600' : 'text-gray-700'}`}>
                                £{Number(price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                    {!shippingTier && (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Select a shipping option above to continue
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Delivery address */}
            {isDelivery && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={deliveryDetails.name}
                      onChange={e => setDeliveryDetails({ ...deliveryDetails, name: e.target.value })}
                      className="input-field"
                      placeholder="Recipient's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={deliveryDetails.phone}
                      onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })}
                      className="input-field"
                      placeholder="07123 456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      value={deliveryDetails.addressLine1}
                      onChange={e => setDeliveryDetails({ ...deliveryDetails, addressLine1: e.target.value })}
                      className="input-field"
                      placeholder="House number and street name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={deliveryDetails.addressLine2}
                      onChange={e => setDeliveryDetails({ ...deliveryDetails, addressLine2: e.target.value })}
                      className="input-field"
                      placeholder="Flat, apartment, etc. (optional)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={deliveryDetails.city}
                        onChange={e => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                        className="input-field"
                        placeholder="London"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postcode *</label>
                      <input
                        type="text"
                        required
                        value={deliveryDetails.postcode}
                        onChange={e => setDeliveryDetails({ ...deliveryDetails, postcode: e.target.value })}
                        className="input-field"
                        placeholder="SW1A 1AA"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collection contact */}
            {!isDelivery && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Details</h2>
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name for collection *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      className="input-field"
                      placeholder="Your name"
                    />
                  </div>
                  {(user?.phone || user?.email) && (
                    <p className="text-sm text-gray-500">
                      We'll reach you at {user.phone || user.email} if needed.
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full btn-primary flex items-center justify-center gap-2 ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Place Order — £{total.toFixed(2)}</span>
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Secure checkout · Your order information is protected
            </p>
          </form>
        </div>
      </div>
    </div>
    </div>
    <Footer />
    </>
  )
}

export default Checkout
