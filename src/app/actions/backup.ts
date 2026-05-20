'use server'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'

export async function getBackupData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as 'deposit' | 'withdrawal'
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string).trim() || null
  const transaction_date = (formData.get('transaction_date') as string) || format(new Date(), 'yyyy-MM-dd')

  if (!['deposit', 'withdrawal'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase.from('backup_fund_transactions').insert({
    user_id: user.id,
    type,
    amount,
    description,
    transaction_date,
  })

  if (error) return { error: error.message }

  revalidatePath('/backup')
  return { success: true }
}

export async function deleteBackupTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('backup_fund_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/backup')
  return { success: true }
}
