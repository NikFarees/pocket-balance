import { getSubscriptions } from '@/app/actions/subscriptions'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscriptionForm } from './SubscriptionForm'
import { SubscriptionList } from './SubscriptionList'

export default async function SubscriptionsPage() {
  const data = await getSubscriptions()
  if (!data || 'error' in data) return null

  const { subscriptions, monthlyCost, yearlyCost, expiringSoon } = data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Subscriptions</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Cost</p>
              <p className="font-heading text-2xl font-bold tabular-nums mt-1">
                RM {monthlyCost.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Yearly Cost</p>
              <p className="font-heading text-2xl font-bold tabular-nums mt-1">RM {yearlyCost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className={expiringSoon > 0 ? 'border-warning/30 bg-warning/10 dark:bg-warning/14 dark:border-warning/22' : ''}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className={`text-xs font-medium uppercase tracking-wider ${expiringSoon > 0 ? 'text-warning/80' : 'text-muted-foreground'}`}>Expiring Soon</p>
              <p className={`font-heading text-2xl font-bold tabular-nums mt-1 ${expiringSoon > 0 ? 'text-warning' : ''}`}>
                {expiringSoon}
              </p>
            </CardContent>
          </Card>
        </div>

        <SubscriptionForm />

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Active Subscriptions</span>
              <span className="text-sm font-normal text-muted-foreground">{subscriptions.length} total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SubscriptionList subscriptions={subscriptions} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
