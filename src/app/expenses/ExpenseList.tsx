'use client'

import { deleteExpense, updateExpense } from '@/app/actions/expenses'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Expense = {
  id: string
  amount: number
  description: string
  category: string | null
  expense_date: string
  created_at: string
}

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string, description: string) {
    setLoadingId(id)
    const result = await deleteExpense(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success(`"${description}" deleted`)
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleUpdate(id: string, formData: FormData) {
    setLoadingId(id)
    const result = await updateExpense(id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Expense updated')
      setEditingId(null)
      router.refresh()
    }
    setLoadingId(null)
  }

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No expenses logged today yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((e) => (
          editingId === e.id
            ? (
              <TableRow key={e.id}>
                <TableCell colSpan={5}>
                  <form
                    action={(formData) => handleUpdate(e.id, formData)}
                    className="flex gap-2 items-end flex-wrap"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <Input name="amount" type="number" step="0.01" defaultValue={e.amount} className="w-28" required />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-40">
                      <span className="text-xs text-muted-foreground">Description</span>
                      <Input name="description" defaultValue={e.description} required />
                    </div>
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-xs text-muted-foreground">Category</span>
                      <Input name="category" defaultValue={e.category ?? ''} placeholder="optional" />
                    </div>
                    <Button type="submit" size="sm" disabled={loadingId === e.id}>Save</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </form>
                </TableCell>
              </TableRow>
            )
            : (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>
                  {e.category
                    ? <Badge variant="secondary">{e.category}</Badge>
                    : <span className="text-muted-foreground text-sm">—</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(e.created_at), 'h:mm a')}
                </TableCell>
                <TableCell className="text-right font-medium">
                  RM {Number(e.amount).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(e.id)}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(e.id, e.description)}
                      disabled={loadingId === e.id}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
        ))}
      </TableBody>
    </Table>
  )
}
