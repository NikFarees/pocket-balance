'use client'

import { deleteSalary } from '@/app/actions/salary'
import { Paginator } from '@/components/Paginator'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type Salary = {
  id: string
  amount: number
  month: string
  notes: string | null
}

export function SalaryHistory({ salaries }: { salaries: Salary[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(salaries.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = salaries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteSalary(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Salary entry deleted')
      router.refresh()
    }
    setDeletingId(null)
  }

  if (salaries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No salary entries yet. Add one above.
      </p>
    )
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paged.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">
              {format(parseISO(s.month), 'MMMM yyyy')}
            </TableCell>
            <TableCell className="text-right">
              RM {Number(s.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {s.notes ?? '—'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="text-destructive hover:text-destructive"
              >
                {deletingId === s.id ? 'Deleting…' : 'Delete'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
