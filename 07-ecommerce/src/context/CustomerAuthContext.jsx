import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CustomerAuthContext = createContext()

const SESSION_KEY = 'bakoel_customer'

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)

  // Load session from localStorage on init
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        setCustomer(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading customer session', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load addresses when customer is logged in
  useEffect(() => {
    if (customer?.id) {
      loadAddresses()
    } else {
      setAddresses([])
    }
  }, [customer])

  const loadAddresses = async () => {
    if (!customer?.id) return
    try {
      const { data, error } = await supabase.rpc('get_customer_addresses', {
        p_customer_id: customer.id
      })
      if (error) throw error
      const list = typeof data === 'string' ? JSON.parse(data) : data
      setAddresses(list || [])
    } catch (err) {
      console.error('Error loading addresses:', err)
    }
  }

  const login = async (phone, password) => {
    try {
      const cleanPhone = phone.trim().replace(/\s/g, '')
      const { data, error } = await supabase.rpc('login_customer', {
        p_phone: cleanPhone,
        p_password: password
      })

      if (error) throw error

      const result = typeof data === 'string' ? JSON.parse(data) : data

      if (result.error) {
        return { success: false, error: result.error }
      }

      setCustomer(result)
      localStorage.setItem(SESSION_KEY, JSON.stringify(result))
      return { success: true, customer: result }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message || 'Terjadi kesalahan sistem' }
    }
  }

  const register = async (name, phone, password, address) => {
    try {
      const cleanPhone = phone.trim().replace(/\s/g, '')
      const { data, error } = await supabase.rpc('register_customer', {
        p_name: name.trim(),
        p_phone: cleanPhone,
        p_password: password,
        p_address: address.trim()
      })

      if (error) throw error

      const result = typeof data === 'string' ? JSON.parse(data) : data

      if (result.error) {
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message || 'Terjadi kesalahan sistem' }
    }
  }

  const logout = () => {
    setCustomer(null)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('bakoel_cart') // Clear cart on customer logout as per design
  }

  const addAddress = async (label, addressText, isDefault) => {
    if (!customer?.id) return { success: false, error: 'User tidak terautentikasi' }
    try {
      const { data, error } = await supabase.rpc('add_customer_address', {
        p_customer_id: customer.id,
        p_label: label.trim() || 'Rumah',
        p_address: addressText.trim(),
        p_is_default: isDefault
      })

      if (error) throw error
      await loadAddresses()
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    }
  }

  const deleteAddress = async (addressId) => {
    if (!customer?.id) return { success: false, error: 'User tidak terautentikasi' }
    try {
      const { error } = await supabase.rpc('delete_customer_address', {
        p_customer_id: customer.id,
        p_address_id: addressId
      })

      if (error) throw error
      await loadAddresses()
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    }
  }

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        addresses,
        loading,
        login,
        register,
        logout,
        addAddress,
        deleteAddress,
        refreshAddresses: loadAddresses
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  )
}

export const useCustomerAuth = () => useContext(CustomerAuthContext)
