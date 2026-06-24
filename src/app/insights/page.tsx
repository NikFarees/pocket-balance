import { Suspense } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { InsightsCharts } from '@/components/insights/InsightsCharts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map(i => (
        <Card key={i}>
          <div className="px-4 pt-4 pb-2">
            <Skeleton className="h-4 w-48" />
          </div>
          <CardContent className="px-4 pb-4">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">Insights</h2>
          <p className="text-sm text-muted-foreground">Spending trends and breakdowns</p>
        </div>
        <Suspense fallback={<ChartsSkeleton />}>
          <InsightsCharts />
        </Suspense>
      </main>
    </div>
  )
}
