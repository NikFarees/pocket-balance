'use server'

import { serverNow } from '@/lib/server-date'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'

export async function getInsightsData(months = 6) {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const now = await serverNow()
  const windowStart = format(startOfMonth(subMonths(now, months - 1)), 'yyyy-MM-dd')
  const windowEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const [expensesRes, incomesRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('expense_date, amount, category')
      .eq('user_id', user.id)
      .gte('expense_date', windowStart)
      .lte('expense_date', windowEnd),

    supabase
      .from('incomes')
      .select('income_date, amount')
      .eq('user_id', user.id)
      .gte('income_date', windowStart)
      .lte('income_date', windowEnd),
  ])

  const expenses = expensesRes.data ?? []
  const incomes = incomesRes.data ?? []

  // Build ordered month label list oldest → newest
  const monthSlots: { key: string; label: string }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i)
    monthSlots.push({
      key: format(startOfMonth(d), 'yyyy-MM-dd'),
      label: format(d, 'MMM yy'),
    })
  }

  // Spend per month
  const spendByMonth: Record<string, number> = {}
  for (const e of expenses) {
    const key = format(startOfMonth(parseISO(e.expense_date)), 'yyyy-MM-dd')
    spendByMonth[key] = (spendByMonth[key] ?? 0) + Number(e.amount)
  }

  const spendingTrend = monthSlots.map(({ key, label }) => ({
    month: label,
    total: Math.round((spendByMonth[key] ?? 0) * 100) / 100,
  }))

  // Income per month
  const incomeByMonth: Record<string, number> = {}
  for (const inc of incomes) {
    const key = format(startOfMonth(parseISO(inc.income_date)), 'yyyy-MM-dd')
    incomeByMonth[key] = (incomeByMonth[key] ?? 0) + Number(inc.amount)
  }

  const incomeVsExpense = monthSlots.map(({ key, label }) => ({
    month: label,
    income: Math.round((incomeByMonth[key] ?? 0) * 100) / 100,
    expense: Math.round((spendByMonth[key] ?? 0) * 100) / 100,
  }))

  // Category breakdown — current month only
  const currentMonthExpenses = expenses.filter(
    e => e.expense_date >= currentMonthStart && e.expense_date <= currentMonthEnd
  )

  const categoryMap: Record<string, number> = {}
  for (const e of currentMonthExpenses) {
    const cat = (e.category?.trim()) || 'Uncategorised'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(e.amount)
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)

  const currentMonthLabel = format(now, 'MMMM yyyy')

  return { spendingTrend, incomeVsExpense, categoryBreakdown, currentMonthLabel }
}
