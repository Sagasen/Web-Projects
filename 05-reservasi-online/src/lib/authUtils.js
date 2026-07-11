// src/lib/authUtils.js
import { supabase } from './supabaseClient'

/**
 * Ambil profil user yang sedang login (termasuk role).
 * Return null jika tidak ada session atau profil belum ada.
 */
export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('getCurrentProfile error:', error.message)
    return null
  }
  return data
}

/**
 * Sign up customer baru.
 * Metadata dikirim ke Supabase Auth → trigger handle_new_user()
 * otomatis insert ke tabel profiles dengan role 'customer'.
 */
export async function signUpCustomer({ fullName, email, phone, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        // Sengaja tidak mengirim 'role' → trigger default ke 'customer'
      },
    },
  })
  return { data, error }
}

/**
 * Login umum (customer maupun admin — keduanya pakai endpoint yang sama).
 */
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

/** Logout. */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}
