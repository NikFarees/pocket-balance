'use client'

import { deleteExpense } from '@/app/actions/expenses'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Paginator } from '@/components/Paginator'
import { format, parseISO } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Expense = {
  id: string
  amount: number
  description: string
  category: string | null
  expense_date: string
}

export function MonthlyExpenseList({
  expenses,
  page,
  totalPages,
  month,
}: {
  expenses: Expense[]
  page: number
  totalPages: number
  month: string
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  async function handleDelete(id: string, description: string) {
    setDeletingId(id)
    const result = await deleteExpense(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success(`"${description}" deleted`)
      router.refresh()
    }
    setDeletingId(null)
  }

  function handlePageChange(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    params.set('month', month)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded this month.</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="hidden sm:table-cell">Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(parseISO(e.expense_date), 'dd MMM')}
              </TableCell>
              <TableCell className="font-medium">{e.description}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {e.category ? <Badge variant="secondary">{e.category}</Badge> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right font-medium">RM {Number(e.amount).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(e.id, e.description)}
                  disabled={deletingId === e.id}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Paginator page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </>
  )
}
