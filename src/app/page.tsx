import { getDashboardData } from '@/app/actions/dashboard'
import { AppHeader } from '@/components/AppHeader'
import { DeductionTable } from '@/components/dashboard/DeductionTable'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const data = await getDashboardData()
  if (!data) return null

  const { salary, currentMonth, deductionsWithStatus, summary } = data
  const { totalLiabilities, totalPaid, freeBalance, netInvested, backupBalance, dailyTarget, todaySpend, carryForward } = summary

  const paidPercent = totalLiabilities > 0 ? Math.min(100, (totalPaid / totalLiabilities) * 100) : 0

  const fmt = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{currentMonth}</h2>
          <p className="text-sm text-muted-foreground">Monthly overview</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Today's Spending — full width on mobile */}
          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today&apos;s Spending</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {dailyTarget !== null ? (
                <div>
                  <p className={cn('text-2xl font-bold', (carryForward + todaySpend) > dailyTarget && 'text-destructive')}>
                    RM {fmt(carryForward + todaySpend)}<span className="text-base font-normal text-muted-foreground"> / RM {fmt(dailyTarget)}</span>
                  </p>
                  {carryForward > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      includes RM {fmt(carryForward)} carried forward from previous days
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-muted-foreground">—</p>
                  <Link href="/settings" className="text-xs text-muted-foreground underline hover:text-foreground">Set daily target</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Liabilities */}
          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Liabilities</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <p className="text-3xl font-bold">RM {fmt(totalLiabilities)}</p>
              <div className="space-y-1">
                <Progress value={paidPercent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">RM {fmt(totalPaid)} paid</p>
              </div>
            </CardContent>
          </Card>

          {/* Investments */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Investments</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">RM {fmt(netInvested)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">net invested</p>
            </CardContent>
          </Card>

          {/* Backup Fund */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backup Fund</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">RM {fmt(backupBalance)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Liabilities table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4 px-4">
            <CardTitle className="text-sm font-semibold">Monthly Liabilities — {currentMonth}</CardTitle>
            <Link href="/deductions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}>Manage</Link>
          </CardHeader>
          <CardContent className="p-0">
            {deductionsWithStatus.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No liabilities set up yet.{' '}
                <Link href="/deductions" className="underline">Add one</Link>
              </div>
            ) : (
              <DeductionTable deductions={deductionsWithStatus} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
