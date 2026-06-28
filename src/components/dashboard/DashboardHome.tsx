import { Suspense } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { TodaySpendSection, TodaySpendSkeleton } from '@/components/dashboard/TodaySpendSection'
import { SummaryCardsSection, SummaryCardsSkeleton } from '@/components/dashboard/SummaryCardsSection'

export function DashboardHome() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">Dashboard Penniwuse</h2>
          <p className="text-sm text-muted-foreground">Monthly overview</p>
        </div>
        <div className="grid grid-cols-2 gap-3 dashboard-grid">
          <Suspense fallback={<TodaySpendSkeleton />}>
            <TodaySpendSection />
          </Suspense>
          <Suspense fallback={<SummaryCardsSkeleton />}>
            <SummaryCardsSection />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
