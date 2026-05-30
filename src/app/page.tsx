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

  const { currentMonth, deductionsWithStatus, summary } = data
  const { totalLiabilities, totalPaid, freeBalance, netInvested, backupBalance, dailyTarget, todaySpend, carryForward, epfTotal, subscriptionMonthlyCost, subscriptionExpiringSoon } = summary

  const paidPercent = totalLiabilities > 0 ? Math.min(100, (totalPaid / totalLiabilities) * 100) : 0

  const fmt = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const cardLink = 'block group cursor-pointer'
  const cardHover = 'transition-colors group-hover:border-primary/50 group-hover:shadow-sm h-full'

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{currentMonth}</h2>
          <p className="text-sm text-muted-foreground">Monthly overview</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Today's Spending — full width */}
          <Link href="/expenses" className={cn(cardLink, 'col-span-2')}>
            <Card className={cardHover}>
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
                    <span className="text-xs text-muted-foreground underline">Set daily target in settings</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Monthly Liabilities */}
          <Link href="/deductions" className={cardLink}>
            <Card className={cardHover}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Liabilities</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-3xl font-bold">RM {fmt(totalLiabilities)}</p>
                <div className="space-y-1">
                  <Progress value={paidPercent} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">RM {fmt(totalPaid)} paid</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* KWSP / EPF */}
          <Link href="/income" className={cardLink}>
            <Card className={cardHover}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EPF / KWSP</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {epfTotal > 0 ? (
                  <>
                    <p className="text-3xl font-bold">RM {fmt(epfTotal)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">accumulated</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground mt-0.5">no contributions yet</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Investments */}
          <Link href="/investments" className={cardLink}>
            <Card className={cardHover}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Investments</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold">RM {fmt(netInvested)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">net invested</p>
              </CardContent>
            </Card>
          </Link>

          {/* Backup Fund */}
          <Link href="/backup" className={cardLink}>
            <Card className={cardHover}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backup Fund</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold">RM {fmt(backupBalance)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">balance</p>
              </CardContent>
            </Card>
          </Link>

          {/* Subscriptions */}
          <Link href="/subscriptions" className={cardLink}>
            <Card className={cardHover}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold">RM {fmt(subscriptionMonthlyCost)}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                {subscriptionExpiringSoon > 0 ? (
                  <p className="text-xs text-orange-500 mt-0.5">{subscriptionExpiringSoon} renewing in 30 days</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">active subscriptions</p>
                )}
              </CardContent>
            </Card>
          </Link>
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
