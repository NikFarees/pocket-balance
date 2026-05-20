'use client'

import { Button } from '@/components/ui/button'
import { addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function MonthNav({ month, paramName = 'month' }: { month: string; paramName?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = parseISO(month)
  const maxMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const isMaxMonth = month >= maxMonth

  function navigate(delta: number) {
    const next = addMonths(current, delta)
    const nextStr = format(startOfMonth(next), 'yyyy-MM-dd')
    if (nextStr > maxMonth) return
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, nextStr)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm font-medium min-w-[110px] text-center">
        {format(current, 'MMMM yyyy')}
      </span>
      <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate(1)} disabled={isMaxMonth}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
