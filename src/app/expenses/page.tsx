import { getExpensesPageData, getMonthExpensesData } from '@/app/actions/expenses'
import { Amount } from '@/components/Amount'
import { AppHeader } from '@/components/AppHeader'
import { MonthNav } from '@/components/MonthNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { serverNow } from '@/lib/server-date'
import { cn } from '@/lib/utils'
import { format, startOfMonth } from 'date-fns'
import Link from 'next/link'
import { AllExpensesCard } from './AllExpensesCard'
import { ExpenseList } from './ExpenseList'
import { MonthlyExpenseList } from './MonthlyExpenseList'
import { QuickAddForm } from './QuickAddForm'

const PAGE_SIZE = 5

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string }>
}) {
  const { month: monthParam, page: pageParam } = await searchParams
  const currentMonth = format(startOfMonth(await serverNow()), 'yyyy-MM-dd')
  const selectedMonth = monthParam ?? currentMonth
  const isCurrentMonth = selectedMonth >= currentMonth
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  if (isCurrentMonth) {
    const data = await getExpensesPageData()
    if (!data) return null

    const { todayExpenses, monthExpenses, todayTotal, dailyTarget, yesterdayOverspend, effectiveTarget, remaining, todayLabel } = data
    const isOver = remaining !== null && remaining < 0

    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Daily Expenses</h2>
              <p className="text-sm text-muted-foreground">{todayLabel}</p>
            </div>
            <MonthNav month={currentMonth} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Daily Target</p>
                <p className="font-heading text-2xl font-bold tabular-nums mt-1">{dailyTarget !== null ? <Amount value={dailyTarget} /> : '—'}</p>
                {dailyTarget === null && (
                  <Link href="/settings" className="text-xs underline text-muted-foreground hover:text-foreground">Set target</Link>
                )}
              </CardContent>
            </Card>

            <Card className={yesterdayOverspend > 0 ? 'border-warning/25 bg-warning/8 dark:bg-warning/14 dark:border-warning/22' : ''}>
              <CardContent className="pt-4 pb-4 px-4">
                <p className={`text-xs font-medium uppercase tracking-wider ${yesterdayOverspend > 0 ? 'text-warning/80' : 'text-muted-foreground'}`}>Effective Target</p>
                <p className={`font-heading text-2xl font-bold tabular-nums mt-1 ${yesterdayOverspend > 0 ? 'text-warning' : ''}`}>{effectiveTarget !== null ? <Amount value={effectiveTarget} /> : '—'}</p>
                {yesterdayOverspend > 0 && (
                  <p className="text-xs text-warning mt-1">−RM {yesterdayOverspend.toFixed(2)} carry-forward</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spent Today</p>
                <p className="font-heading text-2xl font-bold tabular-nums mt-1"><Amount value={todayTotal} /></p>
              </CardContent>
            </Card>

            <Card className={cn(isOver ? 'border-destructive/40 bg-destructive/8 dark:bg-destructive/12' : remaining !== null ? 'border-success/25 bg-success/8 dark:bg-success/12' : '')}>
              <CardContent className="pt-4 pb-4 px-4">
                <p className={cn('text-xs', isOver ? 'text-destructive' : 'text-success')}>
                  {isOver ? 'Over Budget' : 'Remaining'}
                </p>
                <p className={cn('font-heading text-2xl font-bold tabular-nums mt-1', isOver ? 'text-destructive' : remaining !== null ? 'text-success' : '')}>
                  {remaining !== null ? <Amount value={Math.abs(remaining)} /> : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <QuickAddForm />

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Today&apos;s Expenses</span>
                <span className="text-sm font-normal text-muted-foreground">{todayExpenses.length} {todayExpenses.length === 1 ? 'entry' : 'entries'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <ExpenseList expenses={todayExpenses} />
            </CardContent>
          </Card>

          <AllExpensesCard expenses={monthExpenses} />
        </main>
      </div>
    )
  }

  // Past month history view
  const data = await getMonthExpensesData(selectedMonth)
  if (!data) return null

  const { expenses, total, monthLabel } = data
  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = expenses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-semibold">Expenses</h2>
          <MonthNav month={selectedMonth} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold mt-1"><Amount value={total} /></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Entries</p>
              <p className="text-2xl font-bold mt-1">{expenses.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Expenses History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <MonthlyExpenseList
              expenses={paged}
              page={safePage}
              totalPages={totalPages}
              month={selectedMonth}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
