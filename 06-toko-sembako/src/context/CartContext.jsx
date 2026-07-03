import React, { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

const CART_KEY = 'mbahwin_cart'

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])

  // Load cart from localStorage on init
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      if (stored) {
        setCart(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading cart from localStorage', e)
    }
  }, [])

  // Sync cart to localStorage whenever it changes
  const saveCart = (newCart) => {
    setCart(newCart)
    localStorage.setItem(CART_KEY, JSON.stringify(newCart))
  }

  const addToCart = (item) => {
    // item = { variantId, productName, variantName, price, imageUrl }
    const existing = cart.find(c => c.variantId === item.variantId)
    let newCart
    if (existing) {
      newCart = cart.map(c =>
        c.variantId === item.variantId ? { ...c, qty: c.qty + 1 } : c
      )
    } else {
      newCart = [...cart, { ...item, qty: 1 }]
    }
    saveCart(newCart)
  }

  const updateQty = (variantId, qty) => {
    let newCart
    if (qty <= 0) {
      newCart = cart.filter(c => c.variantId !== variantId)
    } else {
      newCart = cart.map(c =>
        c.variantId === variantId ? { ...c, qty: qty } : c
      )
    }
    saveCart(newCart)
  }

  const removeItem = (variantId) => {
    const newCart = cart.filter(c => c.variantId !== variantId)
    saveCart(newCart)
  }

  const clearCart = () => {
    saveCart([])
  }

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.qty, 0)
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        getCartCount,
        getCartTotal
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
