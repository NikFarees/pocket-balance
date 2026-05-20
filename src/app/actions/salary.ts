'use server'

import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getSalaries() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('salaries')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: false })

  return data ?? []
}

export async function upsertSalary(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount') as string)
  const month = formData.get('month') as string
  const notes = (formData.get('notes') as string) || null

  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!month) return { error: 'Select a month' }

  const monthDate = format(startOfMonth(new Date(month + '-01')), 'yyyy-MM-dd')

  const { error } = await supabase.from('salaries').upsert(
    { user_id: user.id, amount, month: monthDate, notes, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,month' }
  )

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/salary')
  return { success: true }
}

export async function deleteSalary(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('salaries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/salary')
  return { success: true }
}
