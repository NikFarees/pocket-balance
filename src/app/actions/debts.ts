'use server'

import { serverToday } from '@/lib/server-date'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type DebtPayment = {
  id: string
  debt_id: string
  amount: number
  paid_date: string
  notes: string | null
  created_at: string
}

export async function getDebts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [debtsRes, paymentsRes] = await Promise.all([
    supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_settled', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('debt_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('paid_date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const all = debtsRes.data ?? []
  const allPayments: DebtPayment[] = paymentsRes.data ?? []

  const paymentsByDebtId: Record<string, DebtPayment[]> = {}
  for (const p of allPayments) {
    if (!paymentsByDebtId[p.debt_id]) paymentsByDebtId[p.debt_id] = []
    paymentsByDebtId[p.debt_id].push(p)
  }

  const enriched = all.map(d => {
    const payments = paymentsByDebtId[d.id] ?? []
    const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
    const remaining = Math.max(0, Number(d.amount) - amountPaid)
    return { ...d, payments, amountPaid, remaining }
  })

  return {
    iOwe: enriched.filter(d => d.type === 'i_owe'),
    theyOwe: enriched.filter(d => d.type === 'they_owe'),
  }
}

export async function createDebt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as string
  const person_name = (formData.get('person_name') as string)?.trim()
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string)?.trim() || null
  const due_date = (formData.get('due_date') as string) || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!['i_owe', 'they_owe'].includes(type)) return { error: 'Invalid type' }
  if (!person_name) return { error: 'Person name is required' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase.from('debts').insert({
    user_id: user.id, type, person_name, amount, description, due_date, notes,
  })

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function settleDebt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .update({ is_settled: true, settled_date: await serverToday() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function unsettleDebt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .update({ is_settled: false, settled_date: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function updateDebt(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const person_name = (formData.get('person_name') as string)?.trim()
  const amount = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string)?.trim() || null
  const due_date = (formData.get('due_date') as string) || null

  if (!person_name) return { error: 'Person name is required' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase
    .from('debts')
    .update({ person_name, amount, description, due_date })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function deleteDebt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/debts')
  return { success: true }
}

export async function addDebtPayment(debtId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amount = parseFloat(formData.get('amount') as string)
  const paid_date = (formData.get('paid_date') as string) || await serverToday()
  const notes = (formData.get('notes') as string)?.trim() || null

  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount' }

  const { error } = await supabase.from('debt_payments').insert({
    debt_id: debtId,
    user_id: user.id,
    amount,
    paid_date,
    notes,
  })

  if (error) return { error: error.message }

  // Auto-settle if fully paid
  const { data: debtData } = await supabase
    .from('debts')
    .select('amount, is_settled')
    .eq('id', debtId)
    .eq('user_id', user.id)
    .single()

  if (debtData && !debtData.is_settled) {
    const { data: paymentsData } = await supabase
      .from('debt_payments')
      .select('amount')
      .eq('debt_id', debtId)
      .eq('user_id', user.id)

    const totalPaid = (paymentsData ?? []).reduce((s, p) => s + Number(p.amount), 0)
    if (totalPaid >= Number(debtData.amount)) {
      await supabase
        .from('debts')
        .update({ is_settled: true, settled_date: await serverToday() })
        .eq('id', debtId)
        .eq('user_id', user.id)
    }
  }

  revalidatePath('/debts')
  return { success: true }
}

export async function deleteDebtPayment(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the payment to find the parent debt
  const { data: payment } = await supabase
    .from('debt_payments')
    .select('debt_id')
    .eq('id', paymentId)
    .eq('user_id', user.id)
    .single()

  if (!payment) return { error: 'Payment not found' }

  const { error } = await supabase
    .from('debt_payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Unsettle parent debt if it was settled
  await supabase
    .from('debts')
    .update({ is_settled: false, settled_date: null })
    .eq('id', payment.debt_id)
    .eq('user_id', user.id)
    .eq('is_settled', true)

  revalidatePath('/debts')
  return { success: true }
}
