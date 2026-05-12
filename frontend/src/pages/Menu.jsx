import { useState, useEffect } from 'react'
import { ShoppingCart, Coffee, Star } from 'lucide-react'
import axios from 'axios'
import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import CartSidebar from '../components/CartSidebar'

const Menu = () => {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const { addItem, getItemCount } = useCart()

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
    fetchCategories()
    fetchMenu()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/menu/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchMenu = async (category = null) => {
    try {
      setLoading(true)
      
      const url = category && category !== 'all'
        ? `/api/menu?category=${encodeURIComponent(category)}`
        : '/api/menu'

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
    <>
    <div className="min-h-screen bg-[#f5f7f2] text-[#252525]">
      {/* Header with Cart */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="flex items-center space-x-3">
              <img src="/rad-logo.png" alt="Rad's Confectionery" className="h-14 w-auto" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff9f32]">Rad's</p>
                <h1 className="text-2xl font-black uppercase text-[#252525]">Confectionery</h1>
              </div>
            </a>
            
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
            backgroundImage: "url('https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=1800&auto=format&fit=crop')"
          }}
        />
        <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-[#ff9f32]">Rad's Confectionery</p>
            <h2 className="max-w-xl text-6xl font-light leading-[1.15] text-[#252525] sm:text-7xl lg:text-8xl">
              Handcrafted Sweet Delights
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#444444]">
              Indulge in beautifully crafted confections, cookies, sweets, and treats made with care in our kitchen.
            </p>
            <a href="#menu-list" className="mt-10 inline-flex bg-[#ff9f32] px-14 py-5 text-lg font-bold text-white transition-colors hover:bg-[#252525]">
              Shop Now
            </a>
          </div>

          <div className="relative min-h-[360px]">
            <img
              src="https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1000&auto=format&fit=crop"
              alt="Handcrafted confectionery"
              className="absolute right-0 top-1/2 h-[300px] w-full -translate-y-1/2 rounded-lg object-cover shadow-2xl sm:h-[420px]"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8f5] px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-5xl font-light leading-tight text-[#252525] sm:text-6xl">
              Sweet In Every Bite
            </h2>
            <p className="mt-8 text-base leading-7 text-[#333333]">
              Premium ingredients, handcrafted with love, and easy ordering for every occasion.
            </p>
          </div>

          <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_1.2fr_1fr]">
            <div className="space-y-16">
              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Star className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black">Premium Ingredients</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Every sweet treat is crafted with quality ingredients, chosen to deliver an unforgettable finish.
                </p>
              </div>

              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Coffee className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black">Table Orders</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Browse the menu, add to cart, and send your order directly to the kitchen.
                </p>
              </div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1587393855524-087f83d95bc9?w=900&auto=format&fit=crop"
              alt="Assorted confectionery and sweets"
              className="mx-auto aspect-[4/3] w-full max-w-xl rounded-lg object-cover shadow-xl"
            />

            <div className="space-y-16">
              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Star className="h-7 w-7 fill-[#ff9f32]" />
                </div>
                <h3 className="text-2xl font-black">Handcrafted Sweets</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Chocolates, fudge, candies, truffles, and confections made fresh for every craving.
                </p>
              </div>

              <div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#ff9f32] shadow-sm">
                  <Coffee className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black">A Treat For All</h3>
                <p className="mt-5 leading-7 text-[#333333]">
                  Gifts, party orders, and everyday indulgences — something special for every sweet tooth.
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
            Browse through our full range of handcrafted sweets, confections, and treats.
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
                      <div key={item.id} className="overflow-hidden rounded-2xl bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                        <Link to={`/menu/${item.id}`} className="block">
                          <div className="aspect-[4/3] overflow-hidden bg-white">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-amber-50')
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-amber-50 text-5xl">🍬</div>
                            )}
                          </div>
                        </Link>

                        <div className="p-6 flex flex-col flex-1">
                          <div className="mb-4">
                            <div>
                              <Link to={`/menu/${item.id}`}>
                                <h3 className="text-2xl font-medium text-[#111827] hover:text-[#ff9f32] transition-colors">{item.name}</h3>
                              </Link>
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

                          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 mt-auto">
                            {item.isSoldOut ? (
                              <span className="w-full text-center py-2 text-sm font-bold text-gray-400 bg-gray-100 rounded">Sold Out</span>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="w-full bg-[#ff9f32] px-4 py-2 font-bold text-white transition-colors hover:bg-[#252525]"
                              >
                                Add to Cart
                              </button>
                            )}
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
              <div key={item.id} className="overflow-hidden rounded-2xl bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                <Link to={`/menu/${item.id}`} className="block">
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
                </Link>

                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <div>
                      <Link to={`/menu/${item.id}`}>
                        <h3 className="text-2xl font-medium text-[#111827] hover:text-[#ff9f32] transition-colors">{item.name}</h3>
                      </Link>
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

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 mt-auto">
                    {item.isSoldOut ? (
                      <span className="w-full text-center py-2 text-sm font-bold text-gray-400 bg-gray-100 rounded">Sold Out</span>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-[#ff9f32] px-4 py-2 font-bold text-white transition-colors hover:bg-[#252525]"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCart && <CartSidebar onClose={() => setShowCart(false)} />}
    </div>
    <Footer />
    </>
  )
}

export default Menu
