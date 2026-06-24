'use server'

import { serverToday } from '@/lib/server-date'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDailyTarget() {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const today = await serverToday()

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
  const user = await getServerUser()
  if (!user) return []
  const supabase = await createClient()

  const { data } = await supabase
    .from('daily_targets')
    .select('*')
    .eq('user_id', user.id)
    .order('effective_from', { ascending: false })

  return data ?? []
}

export async function setDailyTarget(formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const daily_amount = parseFloat(formData.get('daily_amount') as string)
  const effective_from = (formData.get('effective_from') as string) || await serverToday()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
