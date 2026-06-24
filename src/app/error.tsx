'use client'

import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="font-heading text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. You can try again, or head back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => { window.location.href = '/' }}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
