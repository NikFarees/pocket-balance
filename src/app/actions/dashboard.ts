'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfMonth, format } from 'date-fns'

export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')

  const [salaryRes, deductionsRes, paymentsRes] = await Promise.all([
    supabase
      .from('salaries')
      .select('*')
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
  ])

  const salary = salaryRes.data
  const deductions = deductionsRes.data ?? []
  const payments = paymentsRes.data ?? []

  const totalExpected = deductions.reduce((sum, d) => sum + Number(d.expected_amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0)
  const totalUnpaid = totalExpected - totalPaid
  const remainingBalance = salary ? Number(salary.amount) - totalPaid : null

  const deductionsWithStatus = deductions.map((d) => {
    const payment = payments.find((p) => p.deduction_id === d.id)
    return {
      ...d,
      payment: payment ?? null,
      isPaid: !!payment,
    }
  })

  return {
    salary,
    currentMonth: format(now, 'MMMM yyyy'),
    deductionsWithStatus,
    summary: {
      totalExpected,
      totalPaid,
      totalUnpaid,
      remainingBalance,
    },
  }
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
