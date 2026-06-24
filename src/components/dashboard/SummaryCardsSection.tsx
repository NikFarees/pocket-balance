import { getDashboardSummaryData } from '@/app/actions/dashboard'
import { Amount } from '@/components/Amount'
import { DeductionTable } from '@/components/dashboard/DeductionTable'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const cardLink = 'block group cursor-pointer'
const cardHover = 'transition-all duration-200 group-hover:border-primary/40 group-hover:[box-shadow:var(--shadow-card)] h-full'

export async function SummaryCardsSection() {
  const data = await getDashboardSummaryData()
  if (!data) return null
  const { currentMonth, deductionsWithStatus, summary } = data
  const { totalLiabilities, totalPaid, netInvested, backupBalance, epfTotal, subscriptionMonthlyCost, subscriptionExpiringSoon } = summary
  const paidPercent = totalLiabilities > 0 ? Math.min(100, (totalPaid / totalLiabilities) * 100) : 0

  return (
    <>
      {/* Monthly Liabilities */}
      <Link href="/deductions" className={cardLink}>
        <Card className={cardHover}>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <p className="font-heading text-3xl font-bold tabular-nums"><Amount value={totalLiabilities} /></p>
            <div className="space-y-1">
              <Progress value={paidPercent} className="h-1.5" />
              <p className="text-xs text-muted-foreground"><Amount value={totalPaid} /> paid</p>
            </div>
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
            <p className="font-heading text-3xl font-bold tabular-nums"><Amount value={subscriptionMonthlyCost} /><span className="text-base font-normal text-muted-foreground">/mo</span></p>
            {subscriptionExpiringSoon > 0 ? (
              <p className="text-xs text-warning mt-0.5">{subscriptionExpiringSoon} renewing within 30 days</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">active subscriptions</p>
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
            <p className="font-heading text-3xl font-bold tabular-nums"><Amount value={netInvested} /></p>
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
            <p className="font-heading text-3xl font-bold tabular-nums"><Amount value={backupBalance} /></p>
            <p className="text-xs text-muted-foreground mt-0.5">balance</p>
          </CardContent>
        </Card>
      </Link>

      {/* EPF / KWSP — full width */}
      <Link href="/income" className={cn(cardLink, 'col-span-2')}>
        <Card className={cardHover}>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">EPF / KWSP</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {epfTotal > 0 ? (
              <>
                <p className="font-heading text-3xl font-bold tabular-nums"><Amount value={epfTotal} /></p>
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

      {/* Monthly Liabilities table */}
      <div className="col-span-2">
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
      </div>
    </>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
      <div className="col-span-2 rounded-xl border bg-card p-4 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="col-span-2 rounded-xl border bg-card">
        <div className="px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 border-t">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </>
  )
}
