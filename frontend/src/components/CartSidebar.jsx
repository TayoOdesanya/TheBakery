import { Trash2, Plus, Minus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'

const CartSidebar = ({ onClose }) => {
  const {
    items, removeItem, updateQuantity, clearCart,
    getSubtotal, getTotal, shippingCost, setShippingCost,
    fulfillmentType, setFulfillmentType,
    specialInstructions, setSpecialInstructions,
  } = useCart()
  const navigate = useNavigate()

  const handleCheckout = () => {
    if (items.length === 0) return
    if (!fulfillmentType) {
      alert('Please select Collection or Delivery before proceeding.')
      return
    }
    onClose()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-600">£{parseFloat(item.price).toFixed(2)} each</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="font-semibold text-lg">
                      £{(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mb-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>£{getSubtotal().toFixed(2)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>£{shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-1 border-t">
                <span>Total</span>
                <span>£{getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">How would you like to receive your order? *</p>
                <div className="grid grid-cols-2 gap-2">
                  {['collection', 'delivery'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setFulfillmentType(type); if (type === 'collection') setShippingCost(0) }}
                      className={`py-2 text-sm font-bold border-2 rounded transition-colors capitalize ${
                        fulfillmentType === type
                          ? 'border-[#ff9f32] bg-[#ff9f32] text-white'
                          : 'border-gray-200 text-gray-600 hover:border-[#ff9f32]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {fulfillmentType === 'delivery' && getSubtotal() < 10 && (
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded px-2 py-1">
                    Minimum order for delivery is £10.00 (currently £{getSubtotal().toFixed(2)})
                  </p>
                )}
                {fulfillmentType === 'delivery' && (
                  <p className="text-xs text-gray-500 mt-1">Shipping cost and address will be confirmed at checkout.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (Optional)</label>
                <textarea
                  placeholder="Allergies, dietary requirements, gift message…"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="input-field"
                  rows="2"
                  maxLength="500"
                />
              </div>

              <button
                onClick={handleCheckout}
                disabled={!fulfillmentType || items.length === 0 || (fulfillmentType === 'delivery' && getSubtotal() < 10)}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                Proceed to Checkout
              </button>

              <button onClick={clearCart} className="btn-secondary w-full">Clear Cart</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CartSidebar
