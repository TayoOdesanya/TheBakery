import { createContext, useContext, useState } from 'react'

const CartContext = createContext({})

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const addItem = (menuItem, quantity = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === menuItem.id)
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        return [...currentItems, { ...menuItem, quantity }]
      }
    })
  }

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(menuItemId)
      return
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === menuItemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const removeItem = (menuItemId) => {
    setItems(currentItems => 
      currentItems.filter(item => item.id !== menuItemId)
    )
  }

  const clearCart = () => {
    setItems([])
    setTableNumber('')
    setSpecialInstructions('')
  }

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotal = () => {
    return items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0)
  }

  const getCartForCheckout = () => {
    return items.map(item => ({
      menuItemId: item.id,
      quantity: item.quantity,
      unitPrice: parseFloat(item.price)
    }))
  }

  const value = {
    items,
    tableNumber,
    specialInstructions,
    setTableNumber,
    setSpecialInstructions,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItemCount,
    getTotal,
    getCartForCheckout,
    isEmpty: items.length === 0
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}