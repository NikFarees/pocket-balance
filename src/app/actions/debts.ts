'use server'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getDebts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user.id)
    .order('is_settled', { ascending: true })
    .order('created_at', { ascending: false })

  const all = data ?? []
  return {
    iOwe: all.filter(d => d.type === 'i_owe'),
    theyOwe: all.filter(d => d.type === 'they_owe'),
  }
}

export async function createDebt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as string
  const person_name = (formData.get('person_name') as string)?.trim()
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string)?.trim() || null
  const due_date = (formData.get('due_date') as string) || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!['i_owe', 'they_owe'].includes(type)) return { error: 'Invalid type' }
  if (!person_name) return { error: 'Person name is required' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase.from('debts').insert({
    user_id: user.id, type, person_name, amount, description, due_date, notes,
  })

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function settleDebt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .update({ is_settled: true, settled_date: format(new Date(), 'yyyy-MM-dd') })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function unsettleDebt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .update({ is_settled: false, settled_date: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function updateDebt(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const person_name = (formData.get('person_name') as string)?.trim()
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string)?.trim() || null
  const due_date = (formData.get('due_date') as string) || null

  if (!person_name) return { error: 'Person name is required' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase
    .from('debts')
    .update({ person_name, amount, description, due_date })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function deleteDebt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}
