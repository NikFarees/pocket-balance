'use server'

import { createClient } from '@/lib/supabase/server'
import { exceedsLength, MAX_LONG_TEXT, MAX_SHORT_TEXT } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export async function getInvestments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: investments }, { data: txs }] = await Promise.all([
    supabase.from('investments').select('*').eq('user_id', user.id).order('name'),
    supabase.from('investment_transactions').select('investment_id, type, amount').eq('user_id', user.id),
  ])

  const txsByInvestment = (txs ?? []).reduce<Record<string, { bought: number; sold: number; dividend: number }>>((acc, t) => {
    if (!acc[t.investment_id]) acc[t.investment_id] = { bought: 0, sold: 0, dividend: 0 }
    if (t.type === 'buy') acc[t.investment_id].bought += Number(t.amount)
    else if (t.type === 'sell') acc[t.investment_id].sold += Number(t.amount)
    else if (t.type === 'dividend') acc[t.investment_id].dividend += Number(t.amount)
    return acc
  }, {})

  return (investments ?? []).map(inv => {
    const t = txsByInvestment[inv.id] ?? { bought: 0, sold: 0, dividend: 0 }
    return { ...inv, balance: t.bought + t.dividend - t.sold }
  })
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
  const category = (investmentRes.data.category ?? 'trading') as 'trading' | 'unit_trust' | 'savings'

  const totalBought = transactions.filter(t => t.type === 'buy').reduce((s, t) => s + Number(t.amount), 0)
  const totalSold = transactions.filter(t => t.type === 'sell').reduce((s, t) => s + Number(t.amount), 0)
  const totalDividend = transactions.filter(t => t.type === 'dividend').reduce((s, t) => s + Number(t.amount), 0)
  const totalQtyBought = transactions.filter(t => t.type === 'buy' && t.quantity).reduce((s, t) => s + Number(t.quantity), 0)
  const totalQtySold = transactions.filter(t => t.type === 'sell' && t.quantity).reduce((s, t) => s + Number(t.quantity), 0)

  return {
    investment: investmentRes.data,
    transactions,
    summary: {
      category,
      totalBought,
      totalSold,
      totalDividend,
      netInvested: totalBought - totalSold,
      balance: totalBought + totalDividend - totalSold,
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
  const category = (formData.get('category') as string) || 'trading'
  const notes = (formData.get('notes') as string).trim() || null

  if (!name) return { error: 'Name is required' }
  if (!['trading', 'unit_trust', 'savings'].includes(category)) return { error: 'Invalid category' }
  if (exceedsLength(name, MAX_SHORT_TEXT)) return { error: 'Name is too long' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const { data, error } = await supabase
    .from('investments')
    .insert({ user_id: user.id, name, category, notes })
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
  const category = (formData.get('category') as string) || 'trading'
  const notes = (formData.get('notes') as string).trim() || null

  if (!name) return { error: 'Name is required' }
  if (!['trading', 'unit_trust', 'savings'].includes(category)) return { error: 'Invalid category' }
  if (exceedsLength(name, MAX_SHORT_TEXT)) return { error: 'Name is too long' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const { error } = await supabase
    .from('investments')
    .update({ name, category, notes, updated_at: new Date().toISOString() })
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

  const type = formData.get('type') as 'buy' | 'sell' | 'dividend'
  const amount = parseFloat(formData.get('amount') as string)
  const quantityRaw = formData.get('quantity') as string
  const priceRaw = formData.get('price_per_unit') as string
  const quantity = type === 'dividend' ? null : (quantityRaw ? parseFloat(quantityRaw) : null)
  const price_per_unit = type === 'dividend' ? null : (priceRaw ? parseFloat(priceRaw) : null)
  const transaction_date = formData.get('transaction_date') as string
  const notes = (formData.get('notes') as string).trim() || null

  if (!['buy', 'sell', 'dividend'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!transaction_date) return { error: 'Date is required' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

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

export async function updateTransaction(id: string, investmentId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as 'buy' | 'sell' | 'dividend'
  const amount = parseFloat(formData.get('amount') as string)
  const quantityRaw = formData.get('quantity') as string
  const priceRaw = formData.get('price_per_unit') as string
  const quantity = type === 'dividend' ? null : (quantityRaw ? parseFloat(quantityRaw) : null)
  const price_per_unit = type === 'dividend' ? null : (priceRaw ? parseFloat(priceRaw) : null)
  const transaction_date = formData.get('transaction_date') as string
  const notes = (formData.get('notes') as string).trim() || null

  if (!['buy', 'sell', 'dividend'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (!transaction_date) return { error: 'Date is required' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const { error } = await supabase
    .from('investment_transactions')
    .update({ type, amount, quantity, price_per_unit, transaction_date, notes })
    .eq('id', id)
    .eq('user_id', user.id)

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
