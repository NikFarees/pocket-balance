'use client'

import { deleteDailyTarget } from '@/app/actions/settings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Target = {
  id: string
  daily_amount: number
  effective_from: string
}

export function TargetHistory({ targets, currentId }: { targets: Target[]; currentId: string | null }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteDailyTarget(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Target deleted')
      router.refresh()
    }
    setDeletingId(null)
  }

  if (targets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No targets set yet. Add one above.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Effective From</TableHead>
          <TableHead className="text-right">Daily Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">
              {format(parseISO(t.effective_from), 'dd MMM yyyy')}
            </TableCell>
            <TableCell className="text-right">
              RM {Number(t.daily_amount).toFixed(2)}
            </TableCell>
            <TableCell>
              {t.id === currentId
                ? <Badge variant="success">Active</Badge>
                : <Badge variant="secondary">Past</Badge>
              }
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
              >
                {deletingId === t.id ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Deleting…</> : 'Delete'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
