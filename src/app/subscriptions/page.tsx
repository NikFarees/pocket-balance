import { getSubscriptions } from '@/app/actions/subscriptions'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent } from '@/components/ui/card'
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Cost</p>
              <p className={`text-2xl font-bold mt-1 ${monthlyCost > 0 ? 'text-green-600' : ''}`}>
                RM {monthlyCost.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Yearly Cost</p>
              <p className="text-2xl font-bold mt-1">RM {yearlyCost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Expiring Soon</p>
              <p className={`text-2xl font-bold mt-1 ${expiringSoon > 0 ? 'text-orange-500' : ''}`}>
                {expiringSoon}
              </p>
            </CardContent>
          </Card>
        </div>

        <SubscriptionForm />

        <SubscriptionList subscriptions={subscriptions} />
      </main>
    </div>
  )
}
