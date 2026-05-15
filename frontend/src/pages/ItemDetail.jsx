import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShoppingCart, ArrowLeft, Plus, Minus, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { useCart } from '../context/CartContext'
import Footer from '../components/Footer'
import CartSidebar from '../components/CartSidebar'

const ItemDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, getItemCount } = useCart()

  const [item, setItem] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    setLoading(true)
    setQuantity(1)
    setAdded(false)
    axios.get(`/api/menu/${id}`)
      .then(({ data }) => {
        setItem(data.item)
        setRelated(data.related)
      })
      .catch(() => navigate('/menu'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAddToCart = () => {
    addItem(item, quantity)
    setAdded(true)
    setShowCart(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const allergenList = item?.allergens
    ? item.allergens.split(',').map((a) => a.trim()).filter(Boolean)
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ff9f32]" />
      </div>
    )
  }

  if (!item) return null

  return (
    <>
      <div className="min-h-screen bg-[#f5f7f2] text-[#252525]">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="/" className="flex items-center space-x-2 md:space-x-3">
              <img src="/rad-logo.png" alt="R's Confectionery" className="h-10 w-auto md:h-14" />
              <div className="hidden md:block">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff9f32]">R's</p>
                <h1 className="text-2xl font-black uppercase text-[#252525]">Confectionery</h1>
              </div>
            </a>
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center space-x-2 bg-[#ff9f32] px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#252525]"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Cart</span>
              {getItemCount() > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
          {/* Back link */}
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#333] hover:text-[#ff9f32] mb-6 md:mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to menu
          </Link>

          {/* Product view */}
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-2 items-start">
            {/* Image */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="aspect-[4/3] overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-amber-50', 'text-6xl')
                      e.target.parentElement.textContent = '🍬'
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-amber-50 text-6xl">🍬</div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-5 md:space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff9f32]">
                  {item.category}
                </span>
                <h2 className="mt-2 text-3xl font-black text-[#252525] leading-tight md:text-4xl">{item.name}</h2>
                <p className="mt-3 text-2xl font-bold text-[#ff9f32] md:text-3xl">£{item.price.toFixed(2)}</p>
              </div>

              {item.description && (
                <p className="text-base leading-7 text-[#444]">{item.description}</p>
              )}

              {/* Allergen callout */}
              {allergenList.length > 0 && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">Allergen information</p>
                    <p className="text-sm text-amber-700">Contains: {allergenList.join(', ')}</p>
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {item.ingredients && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#252525] mb-2">Ingredients</h3>
                  <p className="text-sm leading-6 text-[#555]">{item.ingredients}</p>
                </div>
              )}

              {/* Weight */}
              {item.weightGrams && (
                <p className="text-sm text-gray-500">Weight: {item.weightGrams}g</p>
              )}

              {/* Quantity + Add to cart */}
              {item.isSoldOut ? (
                <div className="py-4 text-center rounded-xl bg-gray-100 text-gray-400 font-bold text-lg">
                  Sold Out
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold uppercase tracking-[0.15em] text-[#252525]">Quantity</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#ff9f32] transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-lg font-bold">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(item.inventory.quantityAvailable, q + 1))}
                        className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#ff9f32] transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className={`w-full py-4 text-lg font-bold text-white transition-colors ${
                      added ? 'bg-green-500' : 'bg-[#ff9f32] hover:bg-[#252525]'
                    }`}
                  >
                    {added ? 'Added to cart!' : `Add ${quantity > 1 ? `${quantity} × ` : ''}to Cart — £${(item.price * quantity).toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Related items */}
          {related.length > 0 && (
            <section className="mt-12 md:mt-20">
              <h2 className="mb-6 border-b-2 border-[#ff9f32] pb-2 text-2xl font-black text-[#252525]">
                More from {item.category}
              </h2>
              <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3">
                {related.slice(0, 6).map((rel, index) => (
                  <div
                    key={rel.id}
                    className={`overflow-hidden rounded-2xl bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col${index >= 4 ? ' hidden md:flex' : ''}`}
                  >
                    <Link to={`/menu/${rel.id}`} className="block">
                      <div className="aspect-[4/3] overflow-hidden bg-white">
                        {rel.imageUrl ? (
                          <img
                            src={rel.imageUrl}
                            alt={rel.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-amber-50')
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-amber-50 text-3xl md:text-5xl">🍬</div>
                        )}
                      </div>
                    </Link>

                    <div className="p-3 md:p-6 flex flex-col flex-1">
                      <div className="mb-2 md:mb-3">
                        <Link to={`/menu/${rel.id}`}>
                          <h3 className="text-sm font-semibold text-[#111827] hover:text-[#ff9f32] transition-colors md:text-2xl md:font-medium">{rel.name}</h3>
                        </Link>
                      </div>

                      <div className="mt-auto">
                        <div className="text-sm font-bold text-[#ff9f32] mb-2 md:text-lg md:mb-3">
                          £{rel.price.toFixed(2)}
                        </div>
                        <div className="flex items-center border-t border-gray-100 pt-2 md:pt-3">
                          {rel.isSoldOut ? (
                            <span className="w-full text-center py-1.5 text-xs font-bold text-gray-400 bg-gray-100 rounded md:py-2 md:text-sm">Sold Out</span>
                          ) : (
                            <button
                              onClick={() => { addItem(rel, 1); setShowCart(true) }}
                              className="w-full bg-[#ff9f32] px-2 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#252525] md:px-4 md:py-2 md:text-sm"
                            >
                              Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      {showCart && <CartSidebar onClose={() => setShowCart(false)} />}
      <Footer />
    </>
  )
}

export default ItemDetail
