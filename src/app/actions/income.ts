'use server'

import { createClient } from '@/lib/supabase/server'
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getIncomes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .order('income_date', { ascending: false })

  return data ?? []
}

export async function getIncomesForMonth(month: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const monthStart = format(startOfMonth(parseISO(month)), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parseISO(month)), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', user.id)
    .gte('income_date', monthStart)
    .lte('income_date', monthEnd)
    .order('income_date', { ascending: false })

  return data ?? []
}

export async function createIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount') as string)
  const source = (formData.get('source') as string)?.trim()
  const income_date = formData.get('income_date') as string
  const notes = (formData.get('notes') as string) || null

  if (isNaN(amount) || amount === 0) return { error: 'Enter a valid amount' }
  if (!source) return { error: 'Enter a source' }
  if (!income_date) return { error: 'Select a date' }

  const { error } = await supabase.from('incomes').insert({
    user_id: user.id,
    amount,
    source,
    income_date,
    notes,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/income')
  return { success: true }
}

export async function updateIncome(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount') as string)
  const source = (formData.get('source') as string)?.trim()
  const income_date = formData.get('income_date') as string
  const notes = (formData.get('notes') as string) || null

  if (isNaN(amount) || amount === 0) return { error: 'Enter a valid amount' }
  if (!source) return { error: 'Enter a source' }
  if (!income_date) return { error: 'Select a date' }

  const { error } = await supabase
    .from('incomes')
    .update({ amount, source, income_date, notes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/income')
  return { success: true }
}

export async function deleteIncome(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/income')
  return { success: true }
}
