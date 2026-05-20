'use server'

import { createClient } from '@/lib/supabase/server'
import { endOfMonth, format, parseISO, startOfMonth, subDays } from 'date-fns'
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

  const [todayExpensesRes, yesterdayExpensesRes, targetRes, monthExpensesRes] = await Promise.all([
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

    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('expense_date', currentMonth)
      .lte('expense_date', todayStr)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const todayExpenses = todayExpensesRes.data ?? []
  const yesterdayTotal = (yesterdayExpensesRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount), 0
  )
  const target = targetRes.data
  const monthExpenses = monthExpensesRes.data ?? []

  const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const dailyTarget = target ? Number(target.daily_amount) : null
  const yesterdayOverspend = dailyTarget ? Math.max(0, yesterdayTotal - dailyTarget) : 0
  const effectiveTarget = dailyTarget !== null ? dailyTarget - yesterdayOverspend : null
  const remaining = effectiveTarget !== null ? effectiveTarget - todayTotal : null

  return {
    todayExpenses,
    monthExpenses,
    todayTotal,
    dailyTarget,
    yesterdayOverspend,
    effectiveTarget,
    remaining,
    todayLabel: format(today, 'EEEE, d MMMM yyyy'),
  }
}

export async function getMonthExpensesData(month: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const monthStart = parseISO(month)
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .gte('expense_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('expense_date', format(endOfMonth(monthStart), 'yyyy-MM-dd'))
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  const expenses = data ?? []
  return {
    expenses,
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    monthLabel: format(monthStart, 'MMMM yyyy'),
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
