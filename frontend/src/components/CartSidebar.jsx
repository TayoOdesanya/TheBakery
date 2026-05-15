import { Trash2, Plus, Minus, ShoppingBag, X } from 'lucide-react'
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl flex flex-col">
        {/* Amber accent bar */}
        <div className="h-1 bg-[#ff9f32] shrink-0" />

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#ff9f32]" />
            <h2 className="text-lg font-black uppercase text-[#252525]">Your Cart</h2>
            {items.length > 0 && (
              <span className="bg-[#ff9f32] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {items.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-[#252525] hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 px-5 text-center">
            <div className="text-5xl mb-4">🍬</div>
            <p className="font-bold text-[#252525] mb-1">Your cart is empty</p>
            <p className="text-sm text-gray-400">Add some sweets to get started</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-[#252525] truncate">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">£{parseFloat(item.price).toFixed(2)} each</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#ff9f32] transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#ff9f32] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-bold text-sm text-[#252525]">
                      £{(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: totals + actions */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-4 shrink-0">
              {/* Totals */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>£{getSubtotal().toFixed(2)}</span>
                </div>
                {shippingCost > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span>£{shippingCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1.5 border-t border-gray-100">
                  <span className="text-[#252525]">Total</span>
                  <span className="text-[#ff9f32]">£{getTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Fulfillment type */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-2">How would you like your order?</p>
                <div className="grid grid-cols-2 gap-2">
                  {['collection', 'delivery'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setFulfillmentType(type); if (type === 'collection') setShippingCost(0) }}
                      className={`py-2 text-sm font-bold border-2 rounded-lg transition-colors capitalize ${
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
                  <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    Minimum order for delivery is £10.00 (currently £{getSubtotal().toFixed(2)})
                  </p>
                )}
                {fulfillmentType === 'delivery' && (
                  <p className="text-xs text-gray-400 mt-1">Shipping cost confirmed at checkout.</p>
                )}
              </div>

              {/* Special instructions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#252525] mb-1.5">
                  Special Instructions
                  <span className="normal-case font-normal text-gray-400 tracking-normal ml-1">(optional)</span>
                </label>
                <textarea
                  placeholder="Allergies, dietary requirements, gift message…"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent resize-none"
                  rows="2"
                  maxLength="500"
                />
              </div>

              {/* Actions */}
              <button
                onClick={handleCheckout}
                disabled={!fulfillmentType || items.length === 0 || (fulfillmentType === 'delivery' && getSubtotal() < 10)}
                className="w-full py-3.5 text-sm font-bold text-white rounded transition-colors bg-[#ff9f32] hover:bg-[#252525] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Proceed to Checkout — £{getTotal().toFixed(2)}
              </button>

              <button
                onClick={clearCart}
                className="w-full py-2 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartSidebar
