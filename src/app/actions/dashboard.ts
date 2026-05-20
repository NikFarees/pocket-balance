'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfMonth, format } from 'date-fns'

export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')

  const [salaryRes, deductionsRes, paymentsRes, investmentTxRes, backupTxRes] = await Promise.all([
    supabase
      .from('salaries')
      .select('amount')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .maybeSingle(),

    supabase
      .from('deductions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('deduction_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth),

    supabase
      .from('investment_transactions')
      .select('type, amount')
      .eq('user_id', user.id),

    supabase
      .from('backup_fund_transactions')
      .select('type, amount')
      .eq('user_id', user.id),
  ])

  const salary = salaryRes.data
  const deductions = deductionsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const investmentTx = investmentTxRes.data ?? []
  const backupTx = backupTxRes.data ?? []

  const totalLiabilities = deductions.reduce((sum, d) => sum + Number(d.expected_amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0)
  const totalUnpaid = totalLiabilities - totalPaid
  const freeBalance = salary ? Number(salary.amount) - totalLiabilities : null

  const totalInvested = investmentTx
    .filter(t => t.type === 'buy').reduce((s, t) => s + Number(t.amount), 0)
  const totalDivested = investmentTx
    .filter(t => t.type === 'sell').reduce((s, t) => s + Number(t.amount), 0)
  const netInvested = totalInvested - totalDivested

  const backupDeposits = backupTx
    .filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0)
  const backupWithdrawals = backupTx
    .filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0)
  const backupBalance = backupDeposits - backupWithdrawals

  const deductionsWithStatus = deductions.map((d) => {
    const payment = payments.find((p) => p.deduction_id === d.id)
    return { ...d, payment: payment ?? null, isPaid: !!payment }
  })

  return {
    salary,
    currentMonth: format(now, 'MMMM yyyy'),
    deductionsWithStatus,
    summary: {
      totalLiabilities,
      totalPaid,
      totalUnpaid,
      freeBalance,
      netInvested,
      backupBalance,
    },
  }
}

export async function getDeductionHistoryForMonth(month: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [deductionsRes, paymentsRes] = await Promise.all([
    supabase.from('deductions').select('*').eq('user_id', user.id).order('name'),
    supabase.from('deduction_payments').select('*').eq('user_id', user.id).eq('month', month),
  ])

  const deductions = deductionsRes.data ?? []
  const payments = paymentsRes.data ?? []

  return deductions.map((d) => {
    const payment = payments.find((p) => p.deduction_id === d.id)
    return { ...d, payment: payment ?? null, isPaid: !!payment }
  })
}

export async function markDeductionPaid(deductionId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date()
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')

  const { error } = await supabase.from('deduction_payments').insert({
    deduction_id: deductionId,
    user_id: user.id,
    paid_amount: amount,
    payment_date: format(now, 'yyyy-MM-dd'),
    month: currentMonth,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function unmarkDeductionPaid(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('deduction_payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
