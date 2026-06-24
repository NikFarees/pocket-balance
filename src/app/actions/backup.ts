'use server'

import { serverToday } from '@/lib/server-date'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { exceedsLength, MAX_SHORT_TEXT } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export async function getBackupData() {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const { data } = await supabase
    .from('backup_fund_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })

  const transactions = data ?? []
  const totalDeposited = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0)
  const totalWithdrawn = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalDeposited - totalWithdrawn

  return { transactions, totalDeposited, totalWithdrawn, balance }
}

export async function addBackupTransaction(formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const type = formData.get('type') as 'deposit' | 'withdrawal'
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string).trim() || null
  const location = (formData.get('location') as string).trim() || null
  const transaction_date = (formData.get('transaction_date') as string) || await serverToday()

  if (!['deposit', 'withdrawal'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (exceedsLength(description, MAX_SHORT_TEXT)) return { error: 'Description is too long' }
  if (exceedsLength(location, MAX_SHORT_TEXT)) return { error: 'Location is too long' }

  const { error } = await supabase.from('backup_fund_transactions').insert({
    user_id: user.id,
    type,
    amount,
    description,
    location,
    transaction_date,
  })

  if (error) return { error: error.message }

  revalidatePath('/backup')
  return { success: true }
}

export async function updateBackupTransaction(id: string, formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const type = formData.get('type') as 'deposit' | 'withdrawal'
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string).trim() || null
  const location = (formData.get('location') as string).trim() || null
  const transaction_date = formData.get('transaction_date') as string

  if (!['deposit', 'withdrawal'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!transaction_date) return { error: 'Date is required' }
  if (exceedsLength(description, MAX_SHORT_TEXT)) return { error: 'Description is too long' }
  if (exceedsLength(location, MAX_SHORT_TEXT)) return { error: 'Location is too long' }

  const { error } = await supabase
    .from('backup_fund_transactions')
    .update({ type, amount, description, location, transaction_date })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/backup')
  return { success: true }
}

export async function deleteBackupTransaction(id: string) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('backup_fund_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/backup')
  return { success: true }
}
