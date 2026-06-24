'use server'

import { createClient, getServerUser } from '@/lib/supabase/server'
import { exceedsLength, MAX_SHORT_TEXT } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export async function getDeductions() {
  const user = await getServerUser()
  if (!user) return []
  const supabase = await createClient()

  const { data } = await supabase
    .from('deductions')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return data ?? []
}

export async function createDeduction(formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const name = (formData.get('name') as string).trim()
  const expected_amount = parseFloat(formData.get('expected_amount') as string)
  const due_date = formData.get('due_date') ? parseInt(formData.get('due_date') as string) : null
  const category = (formData.get('category') as string).trim() || null

  if (!name) return { error: 'Name is required' }
  if (isNaN(expected_amount) || expected_amount <= 0) return { error: 'Enter a valid amount' }
  if (due_date !== null && (due_date < 1 || due_date > 31)) return { error: 'Due date must be between 1 and 31' }
  if (exceedsLength(name, MAX_SHORT_TEXT)) return { error: 'Name is too long' }
  if (exceedsLength(category, MAX_SHORT_TEXT)) return { error: 'Category is too long' }

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const name = (formData.get('name') as string).trim()
  const expected_amount = parseFloat(formData.get('expected_amount') as string)
  const due_date = formData.get('due_date') ? parseInt(formData.get('due_date') as string) : null
  const category = (formData.get('category') as string).trim() || null

  if (!name) return { error: 'Name is required' }
  if (isNaN(expected_amount) || expected_amount <= 0) return { error: 'Enter a valid amount' }
  if (exceedsLength(name, MAX_SHORT_TEXT)) return { error: 'Name is too long' }
  if (exceedsLength(category, MAX_SHORT_TEXT)) return { error: 'Category is too long' }

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
