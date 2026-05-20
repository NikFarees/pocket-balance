'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const username = (formData.get('username') as string).trim()

  if (!username) return { error: 'Username is required' }
  if (password !== confirmPassword) return { error: 'Passwords do not match' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters' }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Signup failed' }

  // Insert profile with username
  await supabase.from('profiles').insert({ user_id: data.user.id, username })

  // Sign in immediately (email is auto-confirmed via DB trigger)
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    // Account created but couldn't auto sign-in — send to login
    return { success: true }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function checkEmailExists(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email) return { exists: false }
  const { data, error } = await supabase.rpc('check_email_exists', { p_email: email })
  if (error) return { exists: false, error: error.message }
  return { exists: data as boolean }
}

export async function resetPasswordByEmail(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) return { error: 'Passwords do not match' }
  if (newPassword.length < 6) return { error: 'Password must be at least 6 characters' }

  const { data, error } = await supabase.rpc('reset_password_by_email', {
    p_email: email,
    p_new_password: newPassword,
  })

  if (error) return { error: error.message }
  if (!data) return { error: 'No account found with that email' }

  return { success: true }
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) return { error: 'New passwords do not match' }
  if (newPassword.length < 6) return { error: 'Password must be at least 6 characters' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (verifyError) return { error: 'Current password is incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
