import { getExpensesPageData } from '@/app/actions/expenses'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ExpenseList } from './ExpenseList'
import { QuickAddForm } from './QuickAddForm'

export default async function ExpensesPage() {
  const data = await getExpensesPageData()
  if (!data) return null

  const { todayExpenses, todayTotal, dailyTarget, yesterdayOverspend, effectiveTarget, remaining, todayLabel } = data
  const isOver = remaining !== null && remaining < 0

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Daily Expenses</h2>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>

        {/* Budget summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Daily Target</p>
              <p className="text-xl font-bold mt-1">{dailyTarget !== null ? `RM ${dailyTarget.toFixed(2)}` : '—'}</p>
              {dailyTarget === null && (
                <Link href="/settings" className="text-xs underline text-muted-foreground hover:text-foreground">Set target</Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Effective Target</p>
              <p className="text-xl font-bold mt-1">{effectiveTarget !== null ? `RM ${effectiveTarget.toFixed(2)}` : '—'}</p>
              {yesterdayOverspend > 0 && (
                <p className="text-xs text-orange-500 mt-1">−RM {yesterdayOverspend.toFixed(2)} carry-forward</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Spent Today</p>
              <p className="text-xl font-bold mt-1">RM {todayTotal.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className={cn(isOver ? 'border-destructive bg-destructive/5' : remaining !== null ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : '')}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className={cn('text-xs', isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                {isOver ? 'Over Budget' : 'Remaining'}
              </p>
              <p className={cn('text-xl font-bold mt-1', isOver ? 'text-destructive' : remaining !== null ? 'text-green-600 dark:text-green-400' : '')}>
                {remaining !== null ? `RM ${Math.abs(remaining).toFixed(2)}` : '—'}
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
      </main>
    </div>
  )
}
