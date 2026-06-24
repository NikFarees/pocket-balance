import { getInsightsData } from '@/app/actions/insights'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpendingTrendChart } from './SpendingTrendChart'
import { CategoryBreakdownChart } from './CategoryBreakdownChart'
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart'

export async function InsightsCharts() {
  const data = await getInsightsData(6)
  if (!data) return null

  const { spendingTrend, incomeVsExpense, categoryBreakdown, currentMonthLabel } = data

  return (
    <div className="space-y-4">
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
