'use server'

import { createClient, getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const captchaToken = formData.get('captchaToken') as string | null

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: { captchaToken: captchaToken ?? undefined },
  })

  if (error) return { error: error.message }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const needsMfa = aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2'

  redirect(needsMfa ? '/mfa' : '/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const username = (formData.get('username') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const captchaToken = formData.get('captchaToken') as string | null

  if (!username) return { error: 'Username is required' }
  if (password !== confirmPassword) return { error: 'Passwords do not match' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return { error: 'Password must include both letters and numbers' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${siteUrl}/auth/callback`,
      captchaToken: captchaToken ?? undefined,
    },
  })

  if (error) return { error: error.message }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const captchaToken = formData.get('captchaToken') as string | null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    captchaToken: captchaToken ?? undefined,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) return { error: 'Passwords do not match' }
  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' }
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return { error: 'Password must include both letters and numbers' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    const message = error.message.toLowerCase().includes('session')
      ? 'Your password reset link is invalid or expired. Please request a new reset link.'
      : error.message
    return { error: message }
  }
  return { success: true }
}

export async function changePassword(formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) return { error: 'New passwords do not match' }
  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' }
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return { error: 'Password must include both letters and numbers' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (verifyError) return { error: 'Current password is incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
