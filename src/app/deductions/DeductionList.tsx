'use client'

import { deleteDeduction, toggleDeduction } from '@/app/actions/deductions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeductionForm } from './DeductionForm'

type Deduction = {
  id: string
  name: string
  expected_amount: number
  due_date: number | null
  category: string | null
  is_active: boolean
}

export function DeductionList({ deductions }: { deductions: Deduction[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleToggle(id: string, current: boolean) {
    setLoadingId(id)
    const result = await toggleDeduction(id, !current)
    if (result.error) toast.error(result.error)
    else router.refresh()
    setLoadingId(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also remove all payment history for it.`)) return
    setLoadingId(id)
    const result = await deleteDeduction(id)
    if (result.error) toast.error(result.error)
    else toast.success(`${name} deleted`)
    setLoadingId(null)
  }

  if (deductions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No deductions yet. Add one above.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {editingId && (
        <DeductionForm
          editing={deductions.find((d) => d.id === editingId)}
          onCancel={() => setEditingId(null)}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deductions.map((d) => (
            <TableRow key={d.id} className={!d.is_active ? 'opacity-50' : ''}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{d.category ?? '—'}</TableCell>
              <TableCell className="text-sm">{d.due_date ? `${d.due_date}th` : '—'}</TableCell>
              <TableCell className="text-right">
                RM {Number(d.expected_amount).toFixed(2)}
              </TableCell>
              <TableCell>
                {d.is_active
                  ? <Badge variant="default">Active</Badge>
                  : <Badge variant="secondary">Inactive</Badge>
                }
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(editingId === d.id ? null : d.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(d.id, d.is_active)}
                    disabled={loadingId === d.id}
                  >
                    {d.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(d.id, d.name)}
                    disabled={loadingId === d.id}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
