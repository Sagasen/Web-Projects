// src/lib/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { getCurrentProfile } from './authUtils'

const AuthContext = createContext(null)

/**
 * AuthProvider menyimpan session Supabase dan profil user (termasuk role)
 * ke dalam context. Komponen mana pun bisa pakai useAuth() untuk mengakses.
 */
export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Ambil session yang mungkin sudah ada (misalnya setelah refresh halaman)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        getCurrentProfile().then(p => {
          setProfile(p)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // Subscribe ke perubahan auth state (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) {
          const p = await getCurrentProfile()
          setProfile(p)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    profile,
    loading,
    isLoggedIn : !!session,
    isAdmin    : profile?.role === 'admin',
    isCustomer : profile?.role === 'customer',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/** Hook shortcut: const { session, profile, isAdmin } = useAuth() */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
