'use server'

import { createClient, getServerUser } from '@/lib/supabase/server'
import { exceedsLength, MAX_LONG_TEXT, MAX_SHORT_TEXT } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export async function getInvestments() {
  const user = await getServerUser()
  if (!user) return []
  const supabase = await createClient()

  const [{ data: investments }, { data: txs }] = await Promise.all([
    supabase.from('investments').select('*').eq('user_id', user.id).order('name'),
    supabase.from('investment_transactions').select('investment_id, type, amount, fees').eq('user_id', user.id),
  ])

  const txsByInvestment = (txs ?? []).reduce<Record<string, { bought: number; sold: number; dividend: number; walletTopup: number; fees: number }>>((acc, t) => {
    if (!acc[t.investment_id]) acc[t.investment_id] = { bought: 0, sold: 0, dividend: 0, walletTopup: 0, fees: 0 }
    if (t.type === 'buy') acc[t.investment_id].bought += Number(t.amount)
    else if (t.type === 'sell') acc[t.investment_id].sold += Number(t.amount)
    else if (t.type === 'dividend') acc[t.investment_id].dividend += Number(t.amount)
    else if (t.type === 'wallet_topup') acc[t.investment_id].walletTopup += Number(t.amount)
    if (t.fees) acc[t.investment_id].fees += Number(t.fees)
    return acc
  }, {})

  return (investments ?? []).map(inv => {
    const t = txsByInvestment[inv.id] ?? { bought: 0, sold: 0, dividend: 0, walletTopup: 0, fees: 0 }
    const base = t.walletTopup > 0 ? t.walletTopup : (t.bought - t.sold)
    return { ...inv, balance: base - t.fees + t.dividend }
  })
}

export async function getInvestmentWithTransactions(id: string) {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

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
  const totalWalletTopup = transactions.filter(t => t.type === 'wallet_topup').reduce((s, t) => s + Number(t.amount), 0)
  const totalFees = transactions.reduce((s, t) => s + (t.fees ? Number(t.fees) : 0), 0)
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
      totalWalletTopup,
      totalFees,
      walletBalance: totalWalletTopup - totalBought + totalSold,
      netInvested: totalBought - totalSold - totalFees,
      balance: totalBought + totalDividend - totalSold,
      totalQtyBought,
      totalQtySold,
      netQty: totalQtyBought - totalQtySold,
      hasQuantity: transactions.some(t => t.quantity),
      hasWalletTopup: transactions.some(t => t.type === 'wallet_topup'),
      hasFees: transactions.some(t => t.fees),
    },
  }
}

export async function createInvestment(formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const type = formData.get('type') as 'buy' | 'sell' | 'dividend' | 'wallet_topup'
  const amount = parseFloat(formData.get('amount') as string)
  const feesRaw = formData.get('fees') as string
  const fees = feesRaw ? parseFloat(feesRaw) : null
  const asset = (formData.get('asset') as string | null)?.trim() || null
  const quantityRaw = formData.get('quantity') as string
  const priceRaw = formData.get('price_per_unit') as string
  const noQtyPrice = type === 'dividend' || type === 'wallet_topup'
  const quantity = noQtyPrice ? null : (quantityRaw ? parseFloat(quantityRaw) : null)
  const price_per_unit = noQtyPrice ? null : (priceRaw ? parseFloat(priceRaw) : null)
  const transaction_date = formData.get('transaction_date') as string
  const notes = (formData.get('notes') as string | null)?.trim() || null

  if (!['buy', 'sell', 'dividend', 'wallet_topup'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (fees !== null && (isNaN(fees) || fees < 0)) return { error: 'Enter a valid fees amount' }
  if (!transaction_date) return { error: 'Date is required' }
  if (exceedsLength(asset, MAX_SHORT_TEXT)) return { error: 'Asset name is too long' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const { error } = await supabase.from('investment_transactions').insert({
    user_id: user.id,
    investment_id: investmentId,
    type,
    amount,
    fees,
    asset,
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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const type = formData.get('type') as 'buy' | 'sell' | 'dividend' | 'wallet_topup'
  const amount = parseFloat(formData.get('amount') as string)
  const feesRaw = formData.get('fees') as string
  const fees = feesRaw ? parseFloat(feesRaw) : null
  const asset = (formData.get('asset') as string | null)?.trim() || null
  const quantityRaw = formData.get('quantity') as string
  const priceRaw = formData.get('price_per_unit') as string
  const noQtyPrice = type === 'dividend' || type === 'wallet_topup'
  const quantity = noQtyPrice ? null : (quantityRaw ? parseFloat(quantityRaw) : null)
  const price_per_unit = noQtyPrice ? null : (priceRaw ? parseFloat(priceRaw) : null)
  const transaction_date = formData.get('transaction_date') as string
  const notes = (formData.get('notes') as string | null)?.trim() || null

  if (!['buy', 'sell', 'dividend', 'wallet_topup'].includes(type)) return { error: 'Invalid type' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }
  if (fees !== null && (isNaN(fees) || fees < 0)) return { error: 'Enter a valid fees amount' }
  if (!transaction_date) return { error: 'Date is required' }
  if (exceedsLength(asset, MAX_SHORT_TEXT)) return { error: 'Asset name is too long' }
  if (exceedsLength(notes, MAX_LONG_TEXT)) return { error: 'Notes is too long' }

  const { error } = await supabase
    .from('investment_transactions')
    .update({ type, amount, fees, asset, quantity, price_per_unit, transaction_date, notes })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/investments/${investmentId}`)
  return { success: true }
}

export async function deleteTransaction(id: string, investmentId: string) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('investment_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/investments/${investmentId}`)
  return { success: true }
}
