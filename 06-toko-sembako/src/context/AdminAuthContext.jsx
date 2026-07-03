import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AdminAuthContext = createContext()

const SESSION_KEY = 'mbahwin_admin'

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      setAdmin(JSON.parse(stored))
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('admin_profiles')
            .select('id, name, email, role')
            .eq('id', session.user.id)
            .single()

          if (error || !profile) {
            await supabase.auth.signOut()
            setAdmin(null)
            localStorage.removeItem(SESSION_KEY)
          } else {
            const adminData = { id: profile.id, name: profile.name, email: profile.email, role: profile.role }
            setAdmin(adminData)
            localStorage.setItem(SESSION_KEY, JSON.stringify(adminData))
          }
        } catch (e) {
          console.error(e)
          setAdmin(null)
          localStorage.removeItem(SESSION_KEY)
        }
      } else {
        setAdmin(null)
        localStorage.removeItem(SESSION_KEY)
      }
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAdmin(null)
        localStorage.removeItem(SESSION_KEY)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loginAdmin = async (email, password) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('id, name, email, role')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        return { success: false, error: 'Akun Anda tidak terdaftar sebagai admin.' }
      }

      const adminData = { id: profile.id, name: profile.name, email: profile.email, role: profile.role }
      setAdmin(adminData)
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminData))
      return { success: true, admin: adminData }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message || 'Login admin gagal' }
    }
  }

  const logoutAdmin = async () => {
    await supabase.auth.signOut()
    setAdmin(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const isOwner = admin?.role === 'owner'

  return (
    <AdminAuthContext.Provider value={{ admin, loading, loginAdmin, logoutAdmin, isOwner }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)