'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDeductions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('deductions')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return data ?? []
}

export async function createDeduction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string).trim()
  const expected_amount = parseFloat(formData.get('expected_amount') as string)
  const due_date = formData.get('due_date') ? parseInt(formData.get('due_date') as string) : null
  const category = (formData.get('category') as string).trim() || null

  if (!name) return { error: 'Name is required' }
  if (isNaN(expected_amount) || expected_amount <= 0) return { error: 'Enter a valid amount' }
  if (due_date !== null && (due_date < 1 || due_date > 31)) return { error: 'Due date must be between 1 and 31' }

  const { error } = await supabase.from('deductions').insert({
    user_id: user.id,
    name,
    expected_amount,
    due_date,
    category,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/deductions')
  return { success: true }
}

export async function updateDeduction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string).trim()
  const expected_amount = parseFloat(formData.get('expected_amount') as string)
  const due_date = formData.get('due_date') ? parseInt(formData.get('due_date') as string) : null
  const category = (formData.get('category') as string).trim() || null

  if (!name) return { error: 'Name is required' }
  if (isNaN(expected_amount) || expected_amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase
    .from('deductions')
    .update({ name, expected_amount, due_date, category, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/deductions')
  return { success: true }
}

export async function toggleDeduction(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('deductions')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/deductions')
  return { success: true }
}

export async function deleteDeduction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('deductions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/deductions')
  return { success: true }
}
