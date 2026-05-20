'use client'

import { deleteDebt, settleDebt, unsettleDebt } from '@/app/actions/debts'
import { Paginator } from '@/components/Paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Debt = {
  id: string
  type: 'i_owe' | 'they_owe'
  person_name: string
  description: string | null
  amount: number
  due_date: string | null
  is_settled: boolean
  settled_date: string | null
}

const PAGE_SIZE = 10

export function DebtList({ debts, emptyMessage }: { debts: Debt[]; emptyMessage: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(debts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = debts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleSettle(id: string, isSettled: boolean) {
    setLoadingId(id)
    const result = isSettled ? await unsettleDebt(id) : await settleDebt(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success(isSettled ? 'Marked as unpaid' : 'Marked as settled')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteDebt(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Deleted')
      router.refresh()
    }
    setLoadingId(null)
  }

  if (debts.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead className="hidden sm:table-cell">Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden sm:table-cell">Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((d) => (
            <TableRow key={d.id} className={d.is_settled ? 'opacity-50' : ''}>
              <TableCell className="font-medium">{d.person_name}</TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {d.description ?? '—'}
              </TableCell>
              <TableCell className="text-right font-medium">
                RM {Number(d.amount).toFixed(2)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {d.due_date ? format(parseISO(d.due_date), 'dd MMM yyyy') : '—'}
              </TableCell>
              <TableCell>
                {d.is_settled ? (
                  <Badge variant="outline" className="text-muted-foreground">Settled</Badge>
                ) : (
                  <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSettle(d.id, d.is_settled)}
                    disabled={loadingId === d.id}
                  >
                    {d.is_settled ? 'Undo' : 'Settle'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(d.id)}
                    disabled={loadingId === d.id}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
