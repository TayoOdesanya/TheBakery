import { useState, useEffect } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, Coffee, Star } from 'lucide-react'
import axios from 'axios'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'

const Menu = () => {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const { 
    addItem, 
    getItemCount, 
    items, 
    getTotal, 
    removeItem,
    updateQuantity,
    tableNumber,
    setTableNumber,
    specialInstructions,
    setSpecialInstructions,
    clearCart
  } = useCart()

  const navigate = useNavigate()

  const groupedMenuItems = menuItems.reduce((groups, item) => {
    const categoryName = item.category || 'Other'

    if (!groups[categoryName]) {
      groups[categoryName] = []
    }

    groups[categoryName].push(item)
    return groups
  }, {})

  const groupedCategoryNames = Object.keys(groupedMenuItems)

  useEffect(() => {
    // Set base URL once
    axios.defaults.baseURL = 'http://localhost:3001/api'
    
    fetchCategories()
    fetchMenu()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/menu/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchMenu = async (category = null) => {
    try {
      setLoading(true)
      
      const url = category && category !== 'all' 
        ? `/menu?category=${encodeURIComponent(category)}`
        : '/menu'
      
      const response = await axios.get(url)
      setMenuItems(response.data)
      setError(null)
    } catch (error) {
      console.error('Error fetching menu:', error)
      setError('Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    fetchMenu(category === 'all' ? null : category)
  }

  const handleAddToCart = (item) => {
    addItem(item, 1)
    setShowCart(true)
  }

  const handleCheckout = () => {
    if (!tableNumber || parseInt(tableNumber) <= 0) {
      alert('Please enter a valid table number')
      return
    }

    if (items.length === 0) {
      alert('Your cart is empty')
      return
    }

    navigate('/checkout')
  }

  if (loading && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (error && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">{error}</div>
          <button onClick={() => fetchMenu()} className="btn-primary">Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7f2] text-[#252525]">
      {/* Header with Cart */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff9f32]">Freshly baked daily</p>
              <h1 className="text-3xl font-black text-[#252525]">Tayo's Bakery</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <a href="/admin/login" className="text-sm font-semibold text-[#333333] hover:text-[#ff9f32]">Admin</a>
              
              <button 
                onClick={() => setShowCart(!showCart)}
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
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1800&auto=format&fit=crop')"
          }}
        />
        <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-[#ff9f32]">Tayo's Bakery</p>
            <h2 className="max-w-xl text-6xl font-light leading-[1.15] text-[#252525] sm:text-7xl lg:text-8xl">
              Delicious Baked Goodness
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#444444]">
              Start your day the right way with fresh bread, pastries, cakes, and table-ready treats from our kitchen.
            </p>
            <a href="#menu-list" className="mt-10 inline-flex bg-[#ff9f32] px-14 py-5 text-lg font-bold text-white transition-colors hover:bg-[#252525]">
              Shop Now
            </a>
          </div>

          <div className="relative min-h-[360px]">
            <img
              src="https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=1000&auto=format&fit=crop"
              alt="Freshly baked bread"
              className="absolute right-0 top-1/2 h-[300px] w-full -translate-y-1/2 rounded-lg object-cover shadow-2xl sm:h-[420px]"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8f5] px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-5xl font-light leading-tight text-[#252525] sm:text-6xl">
              Indulge In The Taste
            </h2>
            <p className="mt-8 text-base leading-7 text-[#333333]">
              Fresh ingredients, homestyle baking, and easy ordering for every table.
            </p>
          </div>

          <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_1.2fr_1fr]">
            <div className="space-y-16">
              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Star className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black">Fresh Ingredients</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Quality bakes made with simple ingredients and a fresh-from-the-oven finish.
                </p>
              </div>

              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Coffee className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black">Table Orders</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Browse the menu, add favourites, and send your order directly to the kitchen.
                </p>
              </div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=900&auto=format&fit=crop"
              alt="Basket of baked bread"
              className="mx-auto aspect-[4/3] w-full max-w-xl rounded-lg object-cover shadow-xl"
            />

            <div className="space-y-16">
              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Star className="h-7 w-7 fill-[#ff9f32]" />
                </div>
                <h3 className="text-2xl font-black">Homemade Bread</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Oven-fresh breads, cookies, cakes, pastries, and sweet treats for every craving.
                </p>
              </div>

              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Coffee className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black">Healthy & Tasty</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Comforting bakery favourites with a bright, fresh cafe feel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="border-b border-amber-100 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-5 py-2 rounded-full font-bold transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-stone-950 text-white'
                    : 'bg-amber-50 text-stone-700 hover:bg-amber-100'
                }`}
              >
                All Items
              </button>
              
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-5 py-2 rounded-full font-bold transition-colors ${
                    selectedCategory === category
                      ? 'bg-stone-950 text-white'
                      : 'bg-amber-50 text-stone-700 hover:bg-amber-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <main id="menu-list" className="max-w-7xl mx-auto px-4 py-20">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-5xl font-light leading-tight text-[#252525] sm:text-6xl">
            {selectedCategory === 'all' ? 'Our Menu' : selectedCategory}
          </h2>
          <p className="mt-8 text-base leading-7 text-[#333333]">
            Browse through our delectable menu of tasty treats and baked goodies.
          </p>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {selectedCategory === 'all' 
                ? 'No items available at the moment' 
                : `No items in ${selectedCategory} category`
              }
            </p>
          </div>
        ) : selectedCategory === 'all' ? (
          // Show items grouped by category when "All Items" is selected
          <div className="space-y-12">
            {groupedCategoryNames.map((categoryName) => {
              const categoryItems = groupedMenuItems[categoryName]

              return (
                <div key={categoryName}>
                  <h2 className="mb-6 border-b-2 border-[#ff9f32] pb-2 text-2xl font-black text-[#252525]">
                    {categoryName}
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-2xl bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        {item.imageUrl && (
                          <div className="aspect-[4/3] overflow-hidden bg-white p-8">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="p-6">
                          <div className="mb-4">
                            <div>
                              <h3 className="text-2xl font-medium text-[#111827]">{item.name}</h3>
                              <span className="mt-3 inline-block px-2 py-1 text-xs font-medium text-[#ff9f32]">
                                {item.category}
                              </span>
                            </div>
                            <div className="mt-2 text-lg font-bold text-[#ff9f32]">
                              £{parseFloat(item.price).toFixed(2)}
                            </div>
                          </div>
                          
                          {item.description && (
                            <p className="mb-4 text-sm leading-6 text-gray-600">{item.description}</p>
                          )}

                          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                            <span className="text-sm text-gray-500">
                              Stock: {item.inventory?.quantityAvailable || 0}
                            </span>
                            <button 
                              onClick={() => handleAddToCart(item)}
                              className="bg-[#ff9f32] px-4 py-2 font-bold text-white transition-colors hover:bg-[#252525] disabled:opacity-50"
                              disabled={!item.inventory || item.inventory.quantityAvailable === 0}
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Show items in grid when a specific category is selected
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                {item.imageUrl && (
                  <div className="aspect-[4/3] overflow-hidden bg-white p-8">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
                      }}
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="mb-4">
                    <div>
                      <h3 className="text-2xl font-medium text-[#111827]">{item.name}</h3>
                      {item.category && (
                        <span className="mt-3 inline-block px-2 py-1 text-xs font-medium text-[#ff9f32]">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-lg font-bold text-[#ff9f32]">
                      £{parseFloat(item.price).toFixed(2)}
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="mb-4 text-sm leading-6 text-gray-600">{item.description}</p>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <span className="text-sm text-gray-500">
                      Stock: {item.inventory?.quantityAvailable || 0}
                    </span>
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="bg-[#ff9f32] px-4 py-2 font-bold text-white transition-colors hover:bg-[#252525] disabled:opacity-50"
                      disabled={!item.inventory || item.inventory.quantityAvailable === 0}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCart(false)}></div>
          
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button 
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
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
                          <p className="text-sm text-gray-600">
                            £{parseFloat(item.price).toFixed(2)} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
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
                          
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          
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

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>£{getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Table Number *
                    </label>
                    <input
                      type="number"
                      placeholder="Enter table number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="input-field"
                      min="1"
                      max="50"
                      required
                    />
                  </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    placeholder="e.g., No dairy, vegan option, extra spicy, allergies..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="input-field"
                    rows="3"
                    maxLength="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {specialInstructions.length}/500 characters
                  </p>
                </div>
                  
                  <button 
                    onClick={handleCheckout}
                    disabled={!tableNumber || parseInt(tableNumber) <= 0}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    Proceed to Checkout
                  </button>
                  
                  <button 
                    onClick={clearCart}
                    className="btn-secondary w-full"
                  >
                    Clear Cart
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Menu
