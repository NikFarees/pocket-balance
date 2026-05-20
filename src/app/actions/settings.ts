'use server'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getDailyTarget() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('daily_targets')
    .select('*')
    .eq('user_id', user.id)
    .lte('effective_from', today)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export async function getAllDailyTargets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('daily_targets')
    .select('*')
    .eq('user_id', user.id)
    .order('effective_from', { ascending: false })

  return data ?? []
}

export async function setDailyTarget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const daily_amount = parseFloat(formData.get('daily_amount') as string)
  const effective_from = (formData.get('effective_from') as string) || format(new Date(), 'yyyy-MM-dd')

  if (isNaN(daily_amount) || daily_amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase.from('daily_targets').insert({
    user_id: user.id,
    daily_amount,
    effective_from,
  })

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/expenses')
  return { success: true }
}

export async function deleteDailyTarget(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('daily_targets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/expenses')
  return { success: true }
}
