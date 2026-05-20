'use client'

import { deleteTransaction } from '@/app/actions/investments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Transaction = {
  id: string
  type: 'buy' | 'sell'
  amount: number
  quantity: number | null
  price_per_unit: number | null
  transaction_date: string
  notes: string | null
}

export function TransactionList({
  transactions,
  investmentId,
  hasQuantity,
}: {
  transactions: Transaction[]
  investmentId: string
  hasQuantity: boolean
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteTransaction(id, investmentId)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Transaction deleted')
      router.refresh()
    }
    setDeletingId(null)
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount (RM)</TableHead>
            {hasQuantity && <TableHead className="text-right hidden sm:table-cell">Qty</TableHead>}
            {hasQuantity && <TableHead className="text-right hidden sm:table-cell">Price/unit</TableHead>}
            <TableHead className="hidden md:table-cell">Notes</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</TableCell>
              <TableCell>
                <Badge variant={t.type === 'buy' ? 'default' : 'destructive'} className={t.type === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {t.type === 'buy' ? 'Buy' : 'Sell'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                <span className={t.type === 'sell' ? 'text-destructive' : ''}>
                  {t.type === 'sell' ? '−' : '+'}RM {Number(t.amount).toFixed(2)}
                </span>
              </TableCell>
              {hasQuantity && (
                <TableCell className="text-right hidden sm:table-cell text-sm">
                  {t.quantity ? Number(t.quantity).toFixed(4) : '—'}
                </TableCell>
              )}
              {hasQuantity && (
                <TableCell className="text-right hidden sm:table-cell text-sm">
                  {t.price_per_unit ? `RM ${Number(t.price_per_unit).toFixed(2)}` : '—'}
                </TableCell>
              )}
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {t.notes ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
