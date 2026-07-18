'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export function DebtSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger render={<CardHeader className="py-4 cursor-pointer select-none" />}>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{title}</span>
            <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              {count} records
              <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          </CardTitle>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0 pt-4 overflow-x-auto">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
