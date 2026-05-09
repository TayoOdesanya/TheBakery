import { createContext, useContext, useState } from 'react'

const CartContext = createContext({})

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([])
  const [fulfillmentType, setFulfillmentType] = useState('') // 'collection' | 'delivery'
  const [shippingTier, setShippingTier] = useState('')       // 'next_day' | 'standard'
  const [shippingCost, setShippingCost] = useState(0)
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: ''
  })
  const [specialInstructions, setSpecialInstructions] = useState('')

  const addItem = (menuItem, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.id === menuItem.id)
      if (existing) {
        return current.map((i) => i.id === menuItem.id ? { ...i, quantity: i.quantity + quantity } : i)
      }
      return [...current, { ...menuItem, quantity }]
    })
  }

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) { removeItem(menuItemId); return }
    setItems((current) => current.map((i) => i.id === menuItemId ? { ...i, quantity: newQuantity } : i))
  }

  const removeItem = (menuItemId) => {
    setItems((current) => current.filter((i) => i.id !== menuItemId))
  }

  const clearCart = () => {
    setItems([])
    setFulfillmentType('')
    setShippingTier('')
    setShippingCost(0)
    setDeliveryDetails({ name: '', phone: '', addressLine1: '', addressLine2: '', city: '', postcode: '' })
    setSpecialInstructions('')
  }

  const getItemCount = () => items.reduce((t, i) => t + i.quantity, 0)
  const getSubtotal = () => items.reduce((t, i) => t + parseFloat(i.price) * i.quantity, 0)
  const getTotal = () => getSubtotal() + shippingCost
  const getTotalWeight = () => items.reduce((t, i) => t + ((i.weightGrams ?? 500) * i.quantity), 0)

  const getCartForCheckout = () => items.map((i) => ({ menuItemId: i.id, quantity: i.quantity }))

  return (
    <CartContext.Provider value={{
      items,
      fulfillmentType, setFulfillmentType,
      shippingTier, setShippingTier,
      shippingCost, setShippingCost,
      deliveryDetails, setDeliveryDetails,
      specialInstructions, setSpecialInstructions,
      addItem, updateQuantity, removeItem, clearCart,
      getItemCount, getSubtotal, getTotal, getTotalWeight,
      getCartForCheckout,
      isEmpty: items.length === 0
    }}>
      {children}
    </CartContext.Provider>
  )
}
