import { serverToday } from '@/lib/server-date'
import { createClient } from '@/lib/supabase/server'
import { getExpensesPageData } from '@/app/actions/expenses'
import { getBackupData } from '@/app/actions/backup'
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'

/**
 * Server-side execution of the assistant's READ tools. Each function returns a
 * small plain object that becomes the `tool_result` content sent back to Claude.
 * These reuse the existing action/data layer so the numbers always match the UI.
 * Auth is already verified by the route before these run.
 */

export async function runReadTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_today_status':
      return getTodayStatus()
    case 'get_month_summary':
      return getMonthSummary(typeof input.month === 'string' ? input.month : undefined)
    case 'get_backup_balance':
      return getBackupBalance()
    case 'get_debts_summary':
      return getDebtsSummary()
    case 'get_notes':
      return getNotes({
        contains: typeof input.contains === 'string' ? input.contains : undefined,
        limit: typeof input.limit === 'number' ? input.limit : undefined,
      })
    case 'find_entries':
      return findEntries(
        typeof input.kind === 'string' ? input.kind : '',
        {
          date: typeof input.date === 'string' ? input.date : undefined,
          contains: typeof input.contains === 'string' ? input.contains : undefined,
          limit: typeof input.limit === 'number' ? input.limit : undefined,
        }
      )
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function getTodayStatus() {
  const data = await getExpensesPageData()
  if (!data) return { error: 'Not authenticated' }
  return {
    date: data.todayLabel,
    spent_today: data.todayTotal,
    daily_target: data.dailyTarget,
    carry_forward_overspend: data.yesterdayOverspend,
    effective_target_today: data.effectiveTarget,
    remaining_today: data.remaining,
    over_budget: data.remaining !== null ? data.remaining < 0 : null,
  }
}

async function getMonthSummary(month?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const base = month ? parseISO(month) : parseISO(await serverToday())
  const monthStart = format(startOfMonth(base), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(base), 'yyyy-MM-dd')

  const [incomesRes, expensesRes, deductionsRes] = await Promise.all([
    supabase.from('incomes').select('amount').eq('user_id', user.id)
      .gte('income_date', monthStart).lte('income_date', monthEnd),
    supabase.from('expenses').select('amount').eq('user_id', user.id)
      .gte('expense_date', monthStart).lte('expense_date', monthEnd),
    supabase.from('deductions').select('expected_amount').eq('user_id', user.id).eq('is_active', true),
  ])

  const incomeTotal = (incomesRes.data ?? []).reduce((s, i) => s + Number(i.amount), 0)
  const expenseTotal = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const deductionsTotal = (deductionsRes.data ?? []).reduce((s, d) => s + Number(d.expected_amount), 0)

  // No per-category breakdown: `category` is free text and noisy ("drink" vs
  // "drinks"), so totals + net are the useful summary.
  return {
    month: format(base, 'MMMM yyyy'),
    income_total: incomeTotal,
    expense_total: expenseTotal,
    recurring_deductions_total: deductionsTotal,
    net: incomeTotal - expenseTotal - deductionsTotal,
  }
}

async function getBackupBalance() {
  const data = await getBackupData()
  if (!data) return { error: 'Not authenticated' }
  return {
    total_deposited: data.totalDeposited,
    total_withdrawn: data.totalWithdrawn,
    balance: data.balance,
  }
}

async function getDebtsSummary() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const [debtsRes, paymentsRes] = await Promise.all([
    supabase.from('debts').select('id, type, person_name, amount, is_settled').eq('user_id', user.id).eq('is_settled', false),
    supabase.from('debt_payments').select('debt_id, amount').eq('user_id', user.id),
  ])

  const paidByDebt: Record<string, number> = {}
  for (const p of paymentsRes.data ?? []) {
    paidByDebt[p.debt_id] = (paidByDebt[p.debt_id] ?? 0) + Number(p.amount)
  }

  let theyOweTotal = 0
  let iOweTotal = 0
  const theyOwe: { person: string; remaining: number }[] = []
  const iOwe: { person: string; remaining: number }[] = []

  for (const d of debtsRes.data ?? []) {
    const remaining = Math.max(0, Number(d.amount) - (paidByDebt[d.id] ?? 0))
    if (remaining <= 0) continue
    if (d.type === 'they_owe') {
      theyOweTotal += remaining
      theyOwe.push({ person: d.person_name, remaining })
    } else {
      iOweTotal += remaining
      iOwe.push({ person: d.person_name, remaining })
    }
  }

  return {
    total_others_owe_me: theyOweTotal,
    total_i_owe: iOweTotal,
    they_owe: theyOwe,
    i_owe: iOwe,
  }
}

/** Strip HTML tags/entities so the model reads a note as plain text. */
function noteToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<(p|div|br|tr|h[1-6]|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n')
    .trim()
}

/**
 * Read the user's saved notes as plain text so the assistant can answer
 * questions about their plans/targets. Read-only; RLS-scoped to the user.
 */
async function getNotes(opts: { contains?: string; limit?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 10) || 10, 1), 25)
  const { data } = await supabase
    .from('notes')
    .select('title, body, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  let notes = (data ?? []).map(n => ({
    title: n.title as string,
    content: n.body ? noteToText(n.body as string) : '',
    updated: n.updated_at as string,
  }))

  const contains = opts.contains?.toLowerCase()
  if (contains) {
    notes = notes.filter(
      n => n.title.toLowerCase().includes(contains) || n.content.toLowerCase().includes(contains)
    )
  }

  return { notes, count: notes.length }
}

/**
 * Look up recent rows (with their ids) so the model can target a specific entry
 * for the update and delete tools. Read-only; RLS-scoped to the current user.
 */
async function findEntries(
  kind: string,
  opts: { date?: string; contains?: string; limit?: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 10) || 10, 1), 25)
  const like = opts.contains ? `%${opts.contains}%` : null

  switch (kind) {
    case 'expense': {
      let q = supabase.from('expenses')
        .select('id, amount, description, category, expense_date')
        .eq('user_id', user.id)
      if (opts.date) q = q.eq('expense_date', opts.date)
      if (like) q = q.ilike('description', like)
      const { data } = await q.order('created_at', { ascending: false }).limit(limit)
      return { entries: data ?? [] }
    }
    case 'income': {
      let q = supabase.from('incomes')
        .select('id, amount, source, income_date, notes')
        .eq('user_id', user.id)
      if (opts.date) q = q.eq('income_date', opts.date)
      if (like) q = q.ilike('source', like)
      const { data } = await q.order('income_date', { ascending: false }).limit(limit)
      return { entries: data ?? [] }
    }
    case 'debt': {
      let q = supabase.from('debts')
        .select('id, type, person_name, amount, description, due_date, is_settled')
        .eq('user_id', user.id)
      if (like) q = q.ilike('person_name', like)
      const { data } = await q.order('created_at', { ascending: false }).limit(limit)
      return { entries: data ?? [] }
    }
    case 'backup': {
      let q = supabase.from('backup_fund_transactions')
        .select('id, type, amount, description, location, transaction_date')
        .eq('user_id', user.id)
      if (opts.date) q = q.eq('transaction_date', opts.date)
      if (like) q = q.ilike('description', like)
      const { data } = await q.order('transaction_date', { ascending: false }).limit(limit)
      return { entries: data ?? [] }
    }
    case 'investment_transaction': {
      const [txRes, invRes] = await Promise.all([
        (() => {
          let q = supabase.from('investment_transactions')
            .select('id, investment_id, type, amount, quantity, price_per_unit, transaction_date')
            .eq('user_id', user.id)
          if (opts.date) q = q.eq('transaction_date', opts.date)
          return q.order('transaction_date', { ascending: false }).limit(limit * 2)
        })(),
        supabase.from('investments').select('id, name').eq('user_id', user.id),
      ])
      const nameById: Record<string, string> = {}
      for (const inv of invRes.data ?? []) nameById[inv.id] = inv.name
      const contains = opts.contains?.toLowerCase()
      const entries = (txRes.data ?? [])
        .map(t => ({ ...t, investment_name: nameById[t.investment_id] ?? '' }))
        .filter(t => !contains || t.investment_name.toLowerCase().includes(contains))
        .slice(0, limit)
      return { entries }
    }
    default:
      return { error: `Unknown kind: ${kind}` }
  }
}
