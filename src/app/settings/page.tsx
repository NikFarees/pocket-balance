import { getAllDailyTargets, getDailyTarget } from '@/app/actions/settings'
import { Amount } from '@/components/Amount'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TargetForm } from './TargetForm'
import { TargetHistory } from './TargetHistory'

export default async function SettingsPage() {
  const [current, all] = await Promise.all([getDailyTarget(), getAllDailyTargets()])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Daily Target</h2>

        <Card className={cn(current ? 'border-success/25 bg-success/8 dark:bg-success/12 dark:border-success/22' : '')}>
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground">Current daily target</p>
            {current ? (
              <p className="text-3xl font-bold mt-1">
                <Amount value={Number(current.daily_amount)} />
                <span className="text-sm font-normal text-muted-foreground ml-2">/ day</span>
              </p>
            ) : (
              <p className="text-xl font-medium text-muted-foreground mt-1">Not set</p>
            )}
          </CardContent>
        </Card>

        <TargetForm />

        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <TargetHistory targets={all} currentId={current?.id ?? null} />
          </CardContent>
        </Card>

      </main>
    </div>
  )
}
