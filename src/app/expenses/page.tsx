import { getExpensesPageData } from '@/app/actions/expenses'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { QuickAddForm } from './QuickAddForm'
import { ExpenseList } from './ExpenseList'

export default async function ExpensesPage() {
  const data = await getExpensesPageData()
  if (!data) return null

  const { todayExpenses, todayTotal, dailyTarget, yesterdayOverspend, effectiveTarget, remaining, todayLabel } = data

  const isOver = remaining !== null && remaining < 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ← Dashboard
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-lg font-semibold">Daily Expenses</h1>
            <p className="text-xs text-muted-foreground">{todayLabel}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Budget summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Daily Target</p>
              <p className="text-xl font-bold mt-1">
                {dailyTarget !== null ? `RM ${dailyTarget.toFixed(2)}` : '—'}
              </p>
              {dailyTarget === null && (
                <Link href="/settings" className="text-xs underline text-muted-foreground hover:text-foreground">
                  Set target
                </Link>
              )}
            </CardContent>
          </Card>

          {yesterdayOverspend > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-4">
                <p className="text-xs text-orange-600 dark:text-orange-400">Yesterday&apos;s Overspend</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  − RM {yesterdayOverspend.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Effective Target</p>
              <p className="text-xl font-bold mt-1">
                {effectiveTarget !== null ? `RM ${effectiveTarget.toFixed(2)}` : '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Spent Today</p>
              <p className="text-xl font-bold mt-1">RM {todayTotal.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className={cn(isOver ? 'border-destructive bg-destructive/5' : 'border-green-200 bg-green-50 dark:bg-green-950/20')}>
            <CardContent className="pt-4">
              <p className={cn('text-xs', isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                {isOver ? 'Over Budget' : 'Remaining'}
              </p>
              <p className={cn('text-xl font-bold mt-1', isOver ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                {remaining !== null ? `RM ${Math.abs(remaining).toFixed(2)}` : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <QuickAddForm />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Today&apos;s Expenses</span>
              <span className="text-sm font-normal text-muted-foreground">
                {todayExpenses.length} {todayExpenses.length === 1 ? 'entry' : 'entries'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ExpenseList expenses={todayExpenses} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
