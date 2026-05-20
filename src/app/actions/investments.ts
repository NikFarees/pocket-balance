'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getInvestments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return data ?? []
}

export async function getInvestmentWithTransactions(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [investmentRes, txRes] = await Promise.all([
    supabase.from('investments').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('investment_transactions')
      .select('*')
      .eq('investment_id', id)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false }),
  ])

  if (!investmentRes.data) return null

  const transactions = txRes.data ?? []
  const totalBought = transactions.filter(t => t.type === 'buy').reduce((s, t) => s + Number(t.amount), 0)
  const totalSold = transactions.filter(t => t.type === 'sell').reduce((s, t) => s + Number(t.amount), 0)
  const totalQtyBought = transactions.filter(t => t.type === 'buy' && t.quantity).reduce((s, t) => s + Number(t.quantity), 0)
  const totalQtySold = transactions.filter(t => t.type === 'sell' && t.quantity).reduce((s, t) => s + Number(t.quantity), 0)

  return {
    investment: investmentRes.data,
    transactions,
    summary: {
      totalBought,
      totalSold,
      netInvested: totalBought - totalSold,
      totalQtyBought,
      totalQtySold,
      netQty: totalQtyBought - totalQtySold,
      hasQuantity: transactions.some(t => t.quantity),
    },
  }
}

export async function createInvestment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string).trim()
  const type = (formData.get('type') as string).trim() || null
  const notes = (formData.get('notes') as string).trim() || null

  if (!name) return { error: 'Name is required' }

  const { data, error } = await supabase
    .from('investments')
    .insert({ user_id: user.id, name, type, notes })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/investments')
  return { success: true, id: data.id }
}

export async function updateInvestment(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string).trim()
  const type = (formData.get('type') as string).trim() || null
  const notes = (formData.get('notes') as string).trim() || null

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('investments')
    .update({ name, type, notes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/investments')
  revalidatePath(`/investments/${id}`)
  return { success: true }
}

export async function toggleInvestment(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('investments')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/investments')
  return { success: true }
}

export async function deleteInvestment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/investments')
  return { success: true }
}

export async function addTransaction(investmentId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as 'buy' | 'sell'
  const amount = parseFloat(formData.get('amount') as string)
  const quantityRaw = formData.get('quantity') as string
  const priceRaw = formData.get('price_per_unit') as string
  const quantity = quantityRaw ? parseFloat(quantityRaw) : null
  const price_per_unit = priceRaw ? parseFloat(priceRaw) : null
  const transaction_date = formData.get('transaction_date') as string
  const notes = (formData.get('notes') as string).trim() || null

  if (!['buy', 'sell'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!transaction_date) return { error: 'Date is required' }

  const { error } = await supabase.from('investment_transactions').insert({
    user_id: user.id,
    investment_id: investmentId,
    type,
    amount,
    quantity,
    price_per_unit,
    transaction_date,
    notes,
  })

  if (error) return { error: error.message }

  revalidatePath(`/investments/${investmentId}`)
  return { success: true }
}

export async function deleteTransaction(id: string, investmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('investment_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/investments/${investmentId}`)
  return { success: true }
}
