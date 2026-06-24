import { getInsightsData } from '@/app/actions/insights'
import { Amount } from '@/components/Amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { SpendingTrendChart } from './SpendingTrendChart'
import { CategoryBreakdownChart } from './CategoryBreakdownChart'
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart'

export async function InsightsCharts() {
  const data = await getInsightsData(6)
  if (!data) return null

  const { spendingTrend, incomeVsExpense, categoryBreakdown, currentMonthLabel, monthlyExpenseTotal, monthlyExpenseBudget } = data

  const expensePercent = monthlyExpenseBudget && monthlyExpenseBudget > 0
    ? Math.min(100, (monthlyExpenseTotal / monthlyExpenseBudget) * 100)
    : 0
  const expenseOver = monthlyExpenseBudget !== null && monthlyExpenseTotal > monthlyExpenseBudget

  return (
    <div className="space-y-4">
      {monthlyExpenseBudget !== null && (
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Expenses vs Budget — {currentMonthLabel}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <p className="font-heading text-3xl font-bold tabular-nums">
              <Amount value={monthlyExpenseTotal} />
              <span className="text-base font-normal text-muted-foreground"> / <Amount value={monthlyExpenseBudget} /></span>
            </p>
            <div className="space-y-1">
              <Progress value={expensePercent} className={cn('h-1.5', expenseOver && '[&>div]:bg-destructive')} />
              <p className={cn('text-xs', expenseOver ? 'text-destructive' : 'text-muted-foreground')}>
                {expenseOver
                  ? <><Amount value={monthlyExpenseTotal - monthlyExpenseBudget} /> over budget</>
                  : <><Amount value={monthlyExpenseBudget - monthlyExpenseTotal} /> remaining</>}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Spending Trend — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <SpendingTrendChart data={spendingTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Income vs Expenses — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <IncomeVsExpenseChart data={incomeVsExpense} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Spending by Category — {currentMonthLabel}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <CategoryBreakdownChart data={categoryBreakdown} />
        </CardContent>
      </Card>
    </div>
  )
}
