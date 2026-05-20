import { getAllDailyTargets, getDailyTarget } from '@/app/actions/settings'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { TargetForm } from './TargetForm'
import { TargetHistory } from './TargetHistory'

export default async function SettingsPage() {
  const [current, all] = await Promise.all([getDailyTarget(), getAllDailyTargets()])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ← Dashboard
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-lg font-semibold">Daily Target</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Current target callout */}
        <Card className={cn(current ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : '')}>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Current daily target</p>
            {current ? (
              <p className="text-3xl font-bold mt-1">
                RM {Number(current.daily_amount).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-2">/ day</span>
              </p>
            ) : (
              <p className="text-xl font-medium text-muted-foreground mt-1">Not set</p>
            )}
          </CardContent>
        </Card>

        <TargetForm />

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TargetHistory targets={all} currentId={current?.id ?? null} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
