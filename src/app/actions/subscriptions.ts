'use server'

import { serverToday } from '@/lib/server-date'
import { createClient } from '@/lib/supabase/server'
import { addDays, addMonths, differenceInDays, format, parseISO } from 'date-fns'
import { revalidatePath } from 'next/cache'

const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'custom'] as const
type BillingCycle = (typeof VALID_BILLING_CYCLES)[number]

function toMonthlyCost(amount: number, cycle: BillingCycle, customDays?: number | null): number {
  switch (cycle) {
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    case 'custom':
      return customDays && customDays > 0 ? (amount * 30) / customDays : 0
  }
}

function toYearlyCost(amount: number, cycle: BillingCycle, customDays?: number | null): number {
  switch (cycle) {
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'yearly': return amount
    case 'custom':
      return customDays && customDays > 0 ? (amount * 365) / customDays : 0
  }
}

export async function getSubscriptions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('next_renewal', { ascending: true })

  if (error) return { error: error.message }

  const subscriptions = data ?? []
  const today = await serverToday()
  const todayDate = parseISO(today)

  let monthlyCost = 0
  let yearlyCost = 0
  let expiringSoon = 0

  for (const sub of subscriptions) {
    if (!sub.is_active) continue
    const amount = Number(sub.current_cost)
    const cycle = sub.billing_cycle as BillingCycle
    const customDays = sub.custom_days ?? undefined

    monthlyCost += toMonthlyCost(amount, cycle, customDays)
    yearlyCost += toYearlyCost(amount, cycle, customDays)

    if (sub.next_renewal) {
      const renewalDate = parseISO(sub.next_renewal)
      const daysUntilRenewal = differenceInDays(renewalDate, todayDate)
      if (daysUntilRenewal >= 0 && daysUntilRenewal <= 30) {
        expiringSoon++
      }
    }
  }

  return { subscriptions, monthlyCost, yearlyCost, expiringSoon }
}

function parseSubscriptionFormData(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const provider = (formData.get('provider') as string)?.trim() || null
  const category = (formData.get('category') as string)?.trim() || null
  const current_cost_raw = formData.get('current_cost') as string
  const current_cost = current_cost_raw ? parseFloat(current_cost_raw) : 0
  const renewal_cost = parseFloat(formData.get('renewal_cost') as string)
  const billing_cycle = (formData.get('billing_cycle') as string)?.trim()
  const custom_days_raw = formData.get('custom_days') as string
  const custom_days = custom_days_raw ? parseInt(custom_days_raw, 10) : null
  const started_at = (formData.get('started_at') as string) || null
  const next_renewal = (formData.get('next_renewal') as string) || null
  const notes = (formData.get('notes') as string)?.trim() || null

  // Validations
  if (!name) return { validationError: 'Name is required' }
  if (isNaN(renewal_cost) || renewal_cost < 0) return { validationError: 'Enter a valid renewal cost' }
  if (!VALID_BILLING_CYCLES.includes(billing_cycle as BillingCycle)) {
    return { validationError: 'Invalid billing cycle' }
  }
  if (billing_cycle === 'custom') {
    if (!custom_days || isNaN(custom_days) || custom_days <= 0) {
      return { validationError: 'Custom days must be a positive integer' }
    }
  }
  if (!started_at) return { validationError: 'Started date is required' }
  if (!next_renewal) return { validationError: 'Next renewal date is required' }

  const parsed_current_cost = isNaN(current_cost) ? 0 : current_cost

  return {
    fields: {
      name,
      provider,
      category,
      current_cost: parsed_current_cost,
      renewal_cost,
      billing_cycle,
      custom_days: billing_cycle === 'custom' ? custom_days : null,
      started_at,
      next_renewal,
      notes,
    },
  }
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = parseSubscriptionFormData(formData)
  if ('validationError' in result) return { error: result.validationError }

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    ...result.fields,
  })

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { success: true }
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = parseSubscriptionFormData(formData)
  if ('validationError' in result) return { error: result.validationError }

  const { error } = await supabase
    .from('subscriptions')
    .update(result.fields)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { success: true }
}

export async function renewSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !sub) return { error: fetchError?.message ?? 'Subscription not found' }

  const currentRenewal = parseISO(sub.next_renewal)
  const cycle = sub.billing_cycle as BillingCycle
  const customDays: number = sub.custom_days ?? 0

  let nextRenewal: Date
  switch (cycle) {
    case 'monthly':
      nextRenewal = addMonths(currentRenewal, 1)
      break
    case 'quarterly':
      nextRenewal = addMonths(currentRenewal, 3)
      break
    case 'yearly':
      nextRenewal = addMonths(currentRenewal, 12)
      break
    case 'custom':
      nextRenewal = addDays(currentRenewal, customDays)
      break
    default:
      return { error: 'Unknown billing cycle' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      next_renewal: format(nextRenewal, 'yyyy-MM-dd'),
      current_cost: sub.renewal_cost,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { success: true }
}

export async function toggleActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { success: true }
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { success: true }
}
