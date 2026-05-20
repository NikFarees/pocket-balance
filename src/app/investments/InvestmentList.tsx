'use client'

import { deleteInvestment, toggleInvestment } from '@/app/actions/investments'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Investment = {
  id: string
  name: string
  type: string | null
  notes: string | null
  is_active: boolean
}

export function InvestmentList({ investments }: { investments: Investment[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleToggle(id: string, current: boolean) {
    setLoadingId(id)
    const result = await toggleInvestment(id, !current)
    if (result.error) toast.error(result.error)
    else router.refresh()
    setLoadingId(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All transaction records will be lost.`)) return
    setLoadingId(id)
    const result = await deleteInvestment(id)
    if (result.error) toast.error(result.error)
    else toast.success(`${name} deleted`)
    setLoadingId(null)
  }

  if (investments.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No investment accounts yet. Add one above.</p>
  }

  return (
    <div className="divide-y">
      {investments.map((inv) => (
        <div key={inv.id} className={cn('flex items-center justify-between px-6 py-4 gap-4', !inv.is_active && 'opacity-50')}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{inv.name}</span>
              {inv.type && <Badge variant="secondary" className="text-xs">{inv.type}</Badge>}
              {!inv.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            </div>
            {inv.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.notes}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link href={`/investments/${inv.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              View
            </Link>
            <Button variant="ghost" size="sm" onClick={() => handleToggle(inv.id, inv.is_active)} disabled={loadingId === inv.id}>
              {inv.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(inv.id, inv.name)} disabled={loadingId === inv.id}>
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
