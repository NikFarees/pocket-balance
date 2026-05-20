import { AppHeader } from '@/components/AppHeader'
import { Skeleton } from '@/components/ui/skeleton'

function StatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  )
}

function TableRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card divide-y">
      <div className="px-4 py-3 flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function PageLoader({ title, statCount = 4, showTable = true }: {
  title?: string
  statCount?: number
  showTable?: boolean
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {title
          ? <Skeleton className="h-7 w-40" />
          : <div className="space-y-1"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-24" /></div>
        }
        <StatCards count={statCount} />
        {showTable && <TableRows />}
      </main>
    </div>
  )
}
