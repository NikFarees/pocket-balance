'use server'

import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, subDays } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getExpensesPageData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const yesterday = subDays(today, 1)
  const todayStr = format(today, 'yyyy-MM-dd')
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
  const currentMonth = format(startOfMonth(today), 'yyyy-MM-dd')

  const [todayExpensesRes, yesterdayExpensesRes, targetRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('expense_date', todayStr)
      .order('created_at', { ascending: false }),

    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .eq('expense_date', yesterdayStr),

    supabase
      .from('daily_targets')
      .select('*')
      .eq('user_id', user.id)
      .lte('effective_from', todayStr)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const todayExpenses = todayExpensesRes.data ?? []
  const yesterdayTotal = (yesterdayExpensesRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount), 0
  )
  const target = targetRes.data

  const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const dailyTarget = target ? Number(target.daily_amount) : null
  const yesterdayOverspend = dailyTarget ? Math.max(0, yesterdayTotal - dailyTarget) : 0
  const effectiveTarget = dailyTarget !== null ? dailyTarget - yesterdayOverspend : null
  const remaining = effectiveTarget !== null ? effectiveTarget - todayTotal : null

  return {
    todayExpenses,
    todayTotal,
    dailyTarget,
    yesterdayOverspend,
    effectiveTarget,
    remaining,
    todayLabel: format(today, 'EEEE, d MMMM yyyy'),
  }
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string).trim()
  const category = (formData.get('category') as string).trim() || null
  const expense_date = (formData.get('expense_date') as string) || format(new Date(), 'yyyy-MM-dd')

  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!description) return { error: 'Description is required' }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount,
    description,
    category,
    expense_date,
  })

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { success: true }
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string).trim()
  const category = (formData.get('category') as string).trim() || null

  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!description) return { error: 'Description is required' }

  const { error } = await supabase
    .from('expenses')
    .update({ amount, description, category, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { success: true }
}
