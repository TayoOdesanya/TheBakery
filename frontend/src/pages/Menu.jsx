import { useState, useEffect } from 'react'
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header with Cart */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Restaurant Menu</h1>
            
            <div className="flex items-center space-x-4">
              <a href="/admin/login" className="text-gray-600 hover:text-gray-900">Admin</a>
              
              <button 
                onClick={() => setShowCart(!showCart)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Items
              </button>
              
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      <main className="max-w-7xl mx-auto px-4 py-8">
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
            {['Bowls', 'Sides', 'Desserts', 'Dips'].map((categoryName) => {
              const categoryItems = menuItems.filter(item => item.category === categoryName)
              
              if (categoryItems.length === 0) return null
              
              return (
                <div key={categoryName}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-600">
                    {categoryName}
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="card hover:shadow-lg transition-shadow">
                        {item.imageUrl && (
                          <div className="aspect-video overflow-hidden rounded-t-lg">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {item.category}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-blue-600 ml-2">
                              £{parseFloat(item.price).toFixed(2)}
                            </div>
                          </div>
                          
                          {item.description && (
                            <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              Stock: {item.inventory?.quantityAvailable || 0}
                            </span>
                            <button 
                              onClick={() => handleAddToCart(item)}
                              className="btn-primary"
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
              <div key={item.id} className="card hover:shadow-lg transition-shadow">
                {item.imageUrl && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
                      }}
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      {item.category && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-blue-600 ml-2">
                      £{parseFloat(item.price).toFixed(2)}
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Stock: {item.inventory?.quantityAvailable || 0}
                    </span>
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="btn-primary"
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