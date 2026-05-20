'use client'

import { deleteBackupTransaction } from '@/app/actions/backup'
import { Paginator } from '@/components/Paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type Transaction = {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  description: string | null
  transaction_date: string
}

export function BackupHistory({ transactions }: { transactions: Transaction[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewTx, setViewTx] = useState<Transaction | null>(null)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteBackupTransaction(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Transaction deleted')
      setViewTx(null)
      router.refresh()
    }
    setDeletingId(null)
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((t) => (
          <button
            key={t.id}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setViewTx(t)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{t.description ?? (t.type === 'deposit' ? 'Deposit' : 'Withdrawal')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-semibold text-sm ${t.type === 'deposit' ? 'text-green-600' : 'text-destructive'}`}>
                {t.type === 'deposit' ? '+' : '−'}RM {Number(t.amount).toFixed(2)}
              </p>
              <div className="mt-0.5">
                <Badge
                  variant={t.type === 'deposit' ? 'default' : 'destructive'}
                  className={`text-xs ${t.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </Badge>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((t) => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewTx(t)}>
                <TableCell className="text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  <Badge
                    variant={t.type === 'deposit' ? 'default' : 'destructive'}
                    className={t.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.description ?? '—'}</TableCell>
                <TableCell className="text-right font-medium">
                  <span className={t.type === 'withdrawal' ? 'text-destructive' : 'text-green-600'}>
                    {t.type === 'withdrawal' ? '−' : '+'}RM {Number(t.amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost" size="sm" className="text-destructive hover:text-destructive"
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

      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* Detail modal */}
      <Dialog open={!!viewTx} onOpenChange={(open) => { if (!open) setViewTx(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Detail</DialogTitle>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge
                    variant={viewTx.type === 'deposit' ? 'default' : 'destructive'}
                    className={viewTx.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {viewTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className={`font-semibold ${viewTx.type === 'deposit' ? 'text-green-600' : 'text-destructive'}`}>
                    {viewTx.type === 'deposit' ? '+' : '−'}RM {Number(viewTx.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm">{format(parseISO(viewTx.transaction_date), 'dd MMM yyyy')}</span>
                </div>
                {viewTx.description && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <span className="text-sm">{viewTx.description}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(viewTx.id)}
                  disabled={deletingId === viewTx.id}
                >
                  {deletingId === viewTx.id ? 'Deleting…' : 'Delete'}
                </Button>
                <Button variant="outline" onClick={() => setViewTx(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
