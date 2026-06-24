'use server'

import { serverNow } from '@/lib/server-date'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { addDays, differenceInDays, format, getDaysInMonth, parseISO, startOfDay, startOfMonth, subDays } from 'date-fns'

export async function getDashboardData() {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const now = await serverNow()
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')

  const todayStr = format(now, 'yyyy-MM-dd')

  const [incomesRes, deductionsRes, paymentsRes, investmentTxRes, backupTxRes, dailyTargetRes, monthExpensesRes, allIncomesEpfRes, subscriptionsRes] = await Promise.all([
    supabase
      .from('incomes')
      .select('amount')
      .eq('user_id', user.id)
      .gte('income_date', currentMonth)
      .lte('income_date', format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')),

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
      .select('investment_id, type, amount, fees')
      .eq('user_id', user.id),

    supabase
      .from('backup_fund_transactions')
      .select('type, amount')
      .eq('user_id', user.id),

    supabase
      .from('daily_targets')
      .select('daily_amount')
      .eq('user_id', user.id)
      .lte('effective_from', todayStr)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('expenses')
      .select('expense_date, amount')
      .eq('user_id', user.id)
      .gte('expense_date', currentMonth)
      .lte('expense_date', todayStr),

    supabase
      .from('incomes')
      .select('epf_employee, epf_employer')
      .eq('user_id', user.id),

    supabase
      .from('subscriptions')
      .select('current_cost, renewal_cost, billing_cycle, custom_days, next_renewal, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ])

  const incomes = incomesRes.data ?? []
  const deductions = deductionsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const investmentTx = investmentTxRes.data ?? []
  const backupTx = backupTxRes.data ?? []
  const dailyTarget = dailyTargetRes.data ? Number(dailyTargetRes.data.daily_amount) : null
  const monthExpenses = monthExpensesRes.data ?? []
  const allIncomesEpf = allIncomesEpfRes.data ?? []
  const activeSubs = subscriptionsRes.data ?? []

  const totalLiabilities = deductions.reduce((sum, d) => sum + Number(d.expected_amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0)
  const totalUnpaid = totalLiabilities - totalPaid
  const incomeTotal = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const freeBalance = incomeTotal - totalLiabilities

  // Build a map of spend per date
  const spendByDate: Record<string, number> = {}
  for (const e of monthExpenses) {
    spendByDate[e.expense_date] = (spendByDate[e.expense_date] ?? 0) + Number(e.amount)
  }

  const todaySpend = spendByDate[todayStr] ?? 0

  // Cumulative carry-forward: iterate each day from month start up to yesterday
  let carryForward = 0
  if (dailyTarget !== null) {
    const monthStart = startOfMonth(now)
    const yesterday = subDays(now, 1)
    let d = monthStart
    while (d <= yesterday) {
      const dStr = format(d, 'yyyy-MM-dd')
      const spent = spendByDate[dStr] ?? 0
      carryForward = Math.max(0, carryForward + spent - dailyTarget)
      d = addDays(d, 1)
    }
  }

  const investmentTxByAccount = investmentTx.reduce<Record<string, { bought: number; sold: number; dividend: number; walletTopup: number; fees: number }>>((acc, t) => {
    if (!acc[t.investment_id]) acc[t.investment_id] = { bought: 0, sold: 0, dividend: 0, walletTopup: 0, fees: 0 }
    if (t.type === 'buy') acc[t.investment_id].bought += Number(t.amount)
    else if (t.type === 'sell') acc[t.investment_id].sold += Number(t.amount)
    else if (t.type === 'dividend') acc[t.investment_id].dividend += Number(t.amount)
    else if (t.type === 'wallet_topup') acc[t.investment_id].walletTopup += Number(t.amount)
    if (t.fees) acc[t.investment_id].fees += Number(t.fees)
    return acc
  }, {})
  const netInvested = Object.values(investmentTxByAccount).reduce((sum, t) => {
    const base = t.walletTopup > 0 ? t.walletTopup : (t.bought - t.sold)
    return sum + base - t.fees + t.dividend
  }, 0)

  const backupDeposits = backupTx
    .filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0)
  const backupWithdrawals = backupTx
    .filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0)
  const backupBalance = backupDeposits - backupWithdrawals

  const epfEmployee = allIncomesEpf.reduce((s, i) => s + Number(i.epf_employee ?? 0), 0)
  const epfEmployer = allIncomesEpf.reduce((s, i) => s + Number(i.epf_employer ?? 0), 0)
  const epfTotal = epfEmployee + epfEmployer

  function toSubMonthlyCost(cost: number, cycle: string, customDays: number | null): number {
    switch (cycle) {
      case 'monthly': return cost
      case 'quarterly': return cost / 3
      case 'yearly': return cost / 12
      case 'custom': return customDays && customDays > 0 ? (cost * 30) / customDays : 0
      default: return 0
    }
  }

  const subscriptionMonthlyCost = activeSubs.reduce(
    (s, sub) => s + toSubMonthlyCost(Number(sub.current_cost), sub.billing_cycle, sub.custom_days ?? null),
    0
  )
  const subscriptionExpiringSoon = activeSubs.filter(sub => {
    const days = differenceInDays(parseISO(sub.next_renewal), startOfDay(now))
    return days >= 0 && days <= 30
  }).length

  const deductionsWithStatus = deductions.map((d) => {
    const payment = payments.find((p) => p.deduction_id === d.id)
    return { ...d, payment: payment ?? null, isPaid: !!payment }
  })

  return {
    incomeTotal,
    currentMonth: format(now, 'MMMM yyyy'),
    deductionsWithStatus,
    summary: {
      totalLiabilities,
      totalPaid,
      totalUnpaid,
      freeBalance,
      netInvested,
      backupBalance,
      dailyTarget,
      todaySpend,
      carryForward,
      epfTotal,
      subscriptionMonthlyCost,
      subscriptionExpiringSoon,
    },
  }
}

export async function getDailySpendData() {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const now = await serverNow()
  const todayStr = format(now, 'yyyy-MM-dd')
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')

  const [dailyTargetRes, monthExpensesRes] = await Promise.all([
    supabase
      .from('daily_targets')
      .select('daily_amount')
      .eq('user_id', user.id)
      .lte('effective_from', todayStr)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('expenses')
      .select('expense_date, amount')
      .eq('user_id', user.id)
      .gte('expense_date', currentMonth)
      .lte('expense_date', todayStr),
  ])

  const dailyTarget = dailyTargetRes.data ? Number(dailyTargetRes.data.daily_amount) : null
  const monthExpenses = monthExpensesRes.data ?? []

  const spendByDate: Record<string, number> = {}
  for (const e of monthExpenses) {
    spendByDate[e.expense_date] = (spendByDate[e.expense_date] ?? 0) + Number(e.amount)
  }
  const todaySpend = spendByDate[todayStr] ?? 0

  let carryForward = 0
  if (dailyTarget !== null) {
    const monthStart = startOfMonth(now)
    const yesterday = subDays(now, 1)
    let d = monthStart
    while (d <= yesterday) {
      const dStr = format(d, 'yyyy-MM-dd')
      const spent = spendByDate[dStr] ?? 0
      carryForward = Math.max(0, carryForward + spent - dailyTarget)
      d = addDays(d, 1)
    }
  }

  return { dailyTarget, todaySpend, carryForward }
}

export async function getDashboardSummaryData() {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const now = await serverNow()
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')

  const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
  const todayStr = format(now, 'yyyy-MM-dd')

  const [incomesRes, deductionsRes, paymentsRes, investmentTxRes, backupTxRes, allIncomesEpfRes, subscriptionsRes, dailyTargetRes, monthExpensesRes] = await Promise.all([
    supabase
      .from('incomes')
      .select('amount')
      .eq('user_id', user.id)
      .gte('income_date', currentMonth)
      .lte('income_date', monthEnd),

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
      .select('investment_id, type, amount, fees')
      .eq('user_id', user.id),

    supabase
      .from('backup_fund_transactions')
      .select('type, amount')
      .eq('user_id', user.id),

    supabase
      .from('incomes')
      .select('epf_employee, epf_employer')
      .eq('user_id', user.id),

    supabase
      .from('subscriptions')
      .select('current_cost, renewal_cost, billing_cycle, custom_days, next_renewal, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true),

    supabase
      .from('daily_targets')
      .select('daily_amount')
      .eq('user_id', user.id)
      .lte('effective_from', todayStr)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('expense_date', currentMonth)
      .lte('expense_date', monthEnd),
  ])

  const incomes = incomesRes.data ?? []
  const deductions = deductionsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const investmentTx = investmentTxRes.data ?? []
  const backupTx = backupTxRes.data ?? []
  const allIncomesEpf = allIncomesEpfRes.data ?? []
  const activeSubs = subscriptionsRes.data ?? []
  const dailyTarget = dailyTargetRes.data ? Number(dailyTargetRes.data.daily_amount) : null
  const monthExpenses = monthExpensesRes.data ?? []

  const monthlyExpenseTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const monthlyExpenseBudget = dailyTarget !== null ? dailyTarget * getDaysInMonth(now) : null

  const totalLiabilities = deductions.reduce((sum, d) => sum + Number(d.expected_amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0)
  const totalUnpaid = totalLiabilities - totalPaid
  const incomeTotal = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const freeBalance = incomeTotal - totalLiabilities

  const investmentTxByAccount = investmentTx.reduce<Record<string, { bought: number; sold: number; dividend: number; walletTopup: number; fees: number }>>((acc, t) => {
    if (!acc[t.investment_id]) acc[t.investment_id] = { bought: 0, sold: 0, dividend: 0, walletTopup: 0, fees: 0 }
    if (t.type === 'buy') acc[t.investment_id].bought += Number(t.amount)
    else if (t.type === 'sell') acc[t.investment_id].sold += Number(t.amount)
    else if (t.type === 'dividend') acc[t.investment_id].dividend += Number(t.amount)
    else if (t.type === 'wallet_topup') acc[t.investment_id].walletTopup += Number(t.amount)
    if (t.fees) acc[t.investment_id].fees += Number(t.fees)
    return acc
  }, {})
  const netInvested = Object.values(investmentTxByAccount).reduce((sum, t) => {
    const base = t.walletTopup > 0 ? t.walletTopup : (t.bought - t.sold)
    return sum + base - t.fees + t.dividend
  }, 0)

  const backupDeposits = backupTx.filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0)
  const backupWithdrawals = backupTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0)
  const backupBalance = backupDeposits - backupWithdrawals

  const epfEmployee = allIncomesEpf.reduce((s, i) => s + Number(i.epf_employee ?? 0), 0)
  const epfEmployer = allIncomesEpf.reduce((s, i) => s + Number(i.epf_employer ?? 0), 0)
  const epfTotal = epfEmployee + epfEmployer

  function toSubMonthlyCost(cost: number, cycle: string, customDays: number | null): number {
    switch (cycle) {
      case 'monthly': return cost
      case 'quarterly': return cost / 3
      case 'yearly': return cost / 12
      case 'custom': return customDays && customDays > 0 ? (cost * 30) / customDays : 0
      default: return 0
    }
  }

  const subscriptionMonthlyCost = activeSubs.reduce(
    (s, sub) => s + toSubMonthlyCost(Number(sub.current_cost), sub.billing_cycle, sub.custom_days ?? null),
    0
  )
  const subscriptionExpiringSoon = activeSubs.filter(sub => {
    const days = differenceInDays(parseISO(sub.next_renewal), startOfDay(now))
    return days >= 0 && days <= 30
  }).length

  const deductionsWithStatus = deductions.map((d) => {
    const payment = payments.find((p) => p.deduction_id === d.id)
    return { ...d, payment: payment ?? null, isPaid: !!payment }
  })

  return {
    currentMonth: format(now, 'MMMM yyyy'),
    deductionsWithStatus,
    summary: {
      totalLiabilities,
      totalPaid,
      totalUnpaid,
      freeBalance,
      netInvested,
      backupBalance,
      epfTotal,
      subscriptionMonthlyCost,
      subscriptionExpiringSoon,
      monthlyExpenseTotal,
      monthlyExpenseBudget,
    },
  }
}

export async function getDeductionHistoryForMonth(month: string) {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const now = await serverNow()
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
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('deduction_payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
