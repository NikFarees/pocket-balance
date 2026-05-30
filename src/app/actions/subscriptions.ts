'use server'

import { serverToday } from '@/lib/server-date'
import { createClient } from '@/lib/supabase/server'
import { addDays, addMonths, differenceInDays, format, parseISO } from 'date-fns'
import { revalidatePath } from 'next/cache'

const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'custom'] as const
type BillingCycle = (typeof VALID_BILLING_CYCLES)[number]

export type SubscriptionRenewal = {
  id: string
  subscription_id: string
  renewed_on: string
  amount_paid: number
  notes: string | null
  created_at: string
}

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

  const [subsRes, renewalsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('next_renewal', { ascending: true }),
    supabase
      .from('subscription_renewals')
      .select('*')
      .eq('user_id', user.id)
      .order('renewed_on', { ascending: false }),
  ])

  if (subsRes.error) return { error: subsRes.error.message }

  const subscriptions = subsRes.data ?? []
  const allRenewals: SubscriptionRenewal[] = renewalsRes.data ?? []

  const renewalsBySubId: Record<string, SubscriptionRenewal[]> = {}
  for (const r of allRenewals) {
    if (!renewalsBySubId[r.subscription_id]) renewalsBySubId[r.subscription_id] = []
    renewalsBySubId[r.subscription_id].push(r)
  }

  const today = await serverToday()
  const todayDate = parseISO(today)

  let monthlyCost = 0
  let yearlyCost = 0
  let expiringSoon = 0

  const enriched = subscriptions.map(sub => {
    if (sub.is_active) {
      const amount = Number(sub.current_cost)
      const cycle = sub.billing_cycle as BillingCycle
      const customDays = sub.custom_days ?? undefined

      monthlyCost += toMonthlyCost(amount, cycle, customDays)
      yearlyCost += toYearlyCost(amount, cycle, customDays)

      if (sub.next_renewal) {
        const daysUntilRenewal = differenceInDays(parseISO(sub.next_renewal), todayDate)
        if (daysUntilRenewal >= 0 && daysUntilRenewal <= 30) expiringSoon++
      }
    }

    return { ...sub, renewals: renewalsBySubId[sub.id] ?? [] }
  })

  return { subscriptions: enriched, monthlyCost, yearlyCost, expiringSoon }
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
      name, provider, category,
      current_cost: parsed_current_cost, renewal_cost, billing_cycle,
      custom_days: billing_cycle === 'custom' ? custom_days : null,
      started_at, next_renewal, notes,
    },
  }
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = parseSubscriptionFormData(formData)
  if ('validationError' in result) return { error: result.validationError }

  const { error } = await supabase.from('subscriptions').insert({ user_id: user.id, ...result.fields })

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
  if (!sub.next_renewal) return { error: 'Subscription has no renewal date' }
  if (sub.billing_cycle === 'custom' && (!sub.custom_days || sub.custom_days <= 0)) {
    return { error: 'Invalid custom days for this subscription' }
  }

  const currentRenewal = parseISO(sub.next_renewal)
  const cycle = sub.billing_cycle as BillingCycle
  const customDays: number = sub.custom_days ?? 0

  let nextRenewal: Date
  switch (cycle) {
    case 'monthly': nextRenewal = addMonths(currentRenewal, 1); break
    case 'quarterly': nextRenewal = addMonths(currentRenewal, 3); break
    case 'yearly': nextRenewal = addMonths(currentRenewal, 12); break
    case 'custom': nextRenewal = addDays(currentRenewal, customDays); break
    default: return { error: 'Unknown billing cycle' }
  }

  const [updateRes, insertRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .update({ next_renewal: format(nextRenewal, 'yyyy-MM-dd'), current_cost: sub.renewal_cost })
      .eq('id', id)
      .eq('user_id', user.id),
    supabase
      .from('subscription_renewals')
      .insert({
        subscription_id: id,
        user_id: user.id,
        renewed_on: sub.next_renewal,
        amount_paid: sub.renewal_cost,
      }),
  ])

  if (updateRes.error) return { error: updateRes.error.message }
  if (insertRes.error) return { error: insertRes.error.message }

  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { success: true }
}

export async function addSubscriptionRenewal(subscriptionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const renewed_on = (formData.get('renewed_on') as string) || await serverToday()
  const amount_paid = parseFloat(formData.get('amount_paid') as string)
  const notes = (formData.get('notes') as string)?.trim() || null

  if (isNaN(amount_paid) || amount_paid < 0) return { error: 'Enter a valid amount' }
  if (!renewed_on) return { error: 'Date is required' }

  const { error } = await supabase.from('subscription_renewals').insert({
    subscription_id: subscriptionId,
    user_id: user.id,
    renewed_on,
    amount_paid,
    notes,
  })

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  return { success: true }
}

export async function updateSubscriptionRenewal(renewalId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const renewed_on = (formData.get('renewed_on') as string)
  const amount_paid = parseFloat(formData.get('amount_paid') as string)
  const notes = (formData.get('notes') as string)?.trim() || null

  if (isNaN(amount_paid) || amount_paid < 0) return { error: 'Enter a valid amount' }
  if (!renewed_on) return { error: 'Date is required' }

  const { error } = await supabase
    .from('subscription_renewals')
    .update({ renewed_on, amount_paid, notes })
    .eq('id', renewalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  return { success: true }
}

export async function deleteSubscriptionRenewal(renewalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: renewal } = await supabase
    .from('subscription_renewals')
    .select('subscription_id, renewed_on, amount_paid')
    .eq('id', renewalId)
    .eq('user_id', user.id)
    .single()

  if (!renewal) return { error: 'Renewal not found' }

  const [deleteRes, updateRes] = await Promise.all([
    supabase.from('subscription_renewals').delete().eq('id', renewalId).eq('user_id', user.id),
    supabase.from('subscriptions')
      .update({ next_renewal: renewal.renewed_on, current_cost: renewal.amount_paid })
      .eq('id', renewal.subscription_id)
      .eq('user_id', user.id),
  ])

  if (deleteRes.error) return { error: deleteRes.error.message }
  if (updateRes.error) return { error: updateRes.error.message }

  revalidatePath('/subscriptions')
  return { success: true }
}

export async function toggleSubscriptionActive(id: string, isActive: boolean) {
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
