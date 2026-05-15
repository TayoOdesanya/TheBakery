import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShoppingCart, Truck, Package, AlertCircle, CreditCard, Clock } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import Footer from '../components/Footer'

const inputClass = "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"

const Checkout = () => {
  const navigate = useNavigate()
  const {
    items, fulfillmentType,
    shippingTier, setShippingTier,
    shippingCost, setShippingCost,
    deliveryDetails, setDeliveryDetails,
    specialInstructions,
    collectionDate, setCollectionDate,
    getSubtotal, getTotal, getTotalWeight, getCartForCheckout, clearCart
  } = useCart()
  const { user } = useAuth()

  const [shippingRates, setShippingRates] = useState([])
  const [contactName, setContactName] = useState('')
  const [availableDates, setAvailableDates] = useState([])
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
    if (fulfillmentType === 'collection') {
      axios.get('/api/collection-availability')
        .then(res => setAvailableDates(res.data.available || []))
        .catch(() => setError('Failed to load collection dates. Please go back and try again.'))
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
    if (fulfillmentType === 'collection' && availableDates.length > 0 && !collectionDate) {
      setError('Please select a collection date')
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
        collectionDate: fulfillmentType === 'collection' ? collectionDate || null : null,
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
  const canSubmit = !loading && (isDelivery
    ? !!shippingTier
    : (availableDates.length === 0 || !!collectionDate)
  )

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] flex flex-col items-center justify-center px-4 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#252525] mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some items to your cart to continue</p>
        <button
          onClick={() => navigate('/menu')}
          className="bg-[#ff9f32] hover:bg-[#252525] text-white font-bold px-6 py-3 rounded transition-colors"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#f5f7f2]">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center space-x-2 md:space-x-3">
              <img src="/rad-logo.png" alt="R's Confectionery" className="h-10 w-auto md:h-14" />
              <div className="hidden md:block">
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#ff9f32]">R's</p>
                <span className="text-lg md:text-2xl font-black uppercase text-[#252525]">Confectionery</span>
              </div>
            </a>
            <Link to="/menu" className="text-sm font-semibold text-[#333] hover:text-[#ff9f32] transition-colors">
              ← Back to menu
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
          <h1 className="text-2xl md:text-3xl font-black text-[#252525] mb-6 md:mb-8">Checkout</h1>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 md:items-start">

            {/* Left: Order Summary */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-3">Order Summary</h2>
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  {isDelivery
                    ? <><Truck className="h-4 w-4 text-[#ff9f32]" /><span className="font-semibold text-sm text-[#252525]">Delivery</span></>
                    : <><Package className="h-4 w-4 text-[#ff9f32]" /><span className="font-semibold text-sm text-[#252525]">Collection</span></>
                  }
                </div>

                <div className="space-y-3 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-medium text-sm text-[#252525]">{item.name}</p>
                        <p className="text-xs text-gray-400">× {item.quantity}</p>
                      </div>
                      <p className="font-bold text-sm text-[#252525] shrink-0">£{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {specialInstructions && (
                  <div className="border-t border-b border-gray-100 py-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#252525] mb-1">Special Instructions</p>
                        <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded p-2 whitespace-pre-wrap">
                          {specialInstructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  {isDelivery && shippingCost > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Shipping</span>
                      <span>£{shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                    <span className="text-[#252525]">Total</span>
                    <span className="text-[#ff9f32]">£{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Shipping / Address / Contact + Submit */}
            <div className="space-y-5 md:space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">

                {/* Shipping tier selector */}
                {isDelivery && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-3">Shipping Option</h2>
                    {shippingRates.length === 0 ? (
                      <div className="text-gray-400 text-sm bg-white rounded-xl p-4">Loading shipping options…</div>
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
                              className={`w-full text-left p-4 border-2 rounded-xl transition-colors ${
                                selected
                                  ? 'border-[#ff9f32] bg-amber-50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-[#ff9f32]' : 'border-gray-300'}`}>
                                      {selected && <div className="w-2 h-2 rounded-full bg-[#ff9f32]" />}
                                    </div>
                                    <p className="font-bold text-sm text-[#252525]">{tier.display_name}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 ml-6">{tier.estimated_days}</p>
                                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 ml-6">
                                    <Clock className="h-3 w-3" />
                                    Order by {tier.cutoff_hour}:00 to qualify
                                  </div>
                                </div>
                                {price != null && (
                                  <span className={`font-bold text-lg shrink-0 ${selected ? 'text-[#ff9f32]' : 'text-[#252525]'}`}>
                                    £{Number(price).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                        {!shippingTier && (
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
                    <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-3">Delivery Address</h2>
                    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={deliveryDetails.name}
                          onChange={e => setDeliveryDetails({ ...deliveryDetails, name: e.target.value })}
                          className={inputClass}
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
                          className={inputClass}
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
                          className={inputClass}
                          placeholder="House number and street name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          value={deliveryDetails.addressLine2}
                          onChange={e => setDeliveryDetails({ ...deliveryDetails, addressLine2: e.target.value })}
                          className={inputClass}
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
                            className={inputClass}
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
                            className={inputClass}
                            placeholder="SW1A 1AA"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collection details */}
                {!isDelivery && (
                  <div className="space-y-5 md:space-y-6">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-3">Your Details</h2>
                      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name for collection *</label>
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={e => setContactName(e.target.value)}
                            className={inputClass}
                            placeholder="Your name"
                          />
                        </div>
                        {(user?.phone || user?.email) && (
                          <p className="text-xs text-gray-400">
                            We'll reach you at {user.phone || user.email} if needed.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Collection date picker */}
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-3">Collection Date</h2>
                      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-4">
                        {availableDates.length === 0 ? (
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            No collection dates are currently available. Please check back soon or contact us.
                          </p>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Select a date *</label>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {availableDates.slice(0, 18).map((slot) => {
                                  const label = new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                                  const selected = collectionDate === slot.date
                                  return (
                                    <button
                                      key={slot.date}
                                      type="button"
                                      onClick={() => setCollectionDate(slot.date)}
                                      className={`p-3 text-sm border-2 rounded-xl transition-colors text-left ${
                                        selected
                                          ? 'border-[#ff9f32] bg-amber-50 text-[#252525] font-semibold'
                                          : 'border-gray-200 hover:border-amber-300 text-gray-600'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                            {collectionDate && (() => {
                              const slot = availableDates.find((s) => s.date === collectionDate)
                              return slot ? (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                  <Clock className="h-4 w-4 shrink-0" />
                                  Collection window: <span className="font-semibold">{slot.openTime} – {slot.closeTime}</span>
                                </div>
                              ) : null
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-4 text-base font-bold text-white rounded transition-colors flex items-center justify-center gap-2 ${
                    canSubmit ? 'bg-[#ff9f32] hover:bg-[#252525]' : 'bg-gray-300 cursor-not-allowed'
                  }`}
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

                <p className="text-xs text-gray-400 text-center">
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
