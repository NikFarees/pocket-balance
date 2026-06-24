import { getDailySpendData } from '@/app/actions/dashboard'
import { Amount } from '@/components/Amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export async function TodaySpendSection() {
  const data = await getDailySpendData()
  if (!data) return null
  const { dailyTarget, todaySpend, carryForward } = data
  const isOver = dailyTarget !== null && (carryForward + todaySpend) > dailyTarget

  return (
    <Link href="/expenses" className="block group cursor-pointer col-span-2">
      <Card className={cn(
        'transition-all duration-200 group-hover:border-primary/40 group-hover:[box-shadow:var(--shadow-card)] h-full',
        dailyTarget !== null && isOver
          ? 'border-destructive/30 bg-destructive/5 dark:bg-destructive/12 dark:border-destructive/22'
          : dailyTarget !== null
          ? 'border-success/25 bg-success/8 dark:bg-success/12 dark:border-success/22'
          : ''
      )}>
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today&apos;s Spending</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {dailyTarget !== null ? (
            <div>
              <p className={cn('font-heading text-2xl font-bold tabular-nums text-glow', isOver && 'text-destructive')}>
                <Amount value={carryForward + todaySpend} />
                <span className="text-base font-normal text-muted-foreground"> / <Amount value={dailyTarget} /></span>
              </p>
              {carryForward > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  includes <Amount value={carryForward} /> carried forward from previous days
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
  )
}

export function TodaySpendSkeleton() {
  return (
    <div className="col-span-2 rounded-xl border bg-card p-4 space-y-2">
      <div className="h-3 w-28 bg-muted rounded animate-pulse" />
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
    </div>
  )
}
