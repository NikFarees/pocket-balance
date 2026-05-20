'use client'

import { deleteBackupTransaction } from '@/app/actions/backup'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Transaction = {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  description: string | null
  transaction_date: string
}

export function BackupHistory({ transactions }: { transactions: Transaction[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteBackupTransaction(id)
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
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</TableCell>
              <TableCell>
                <Badge variant={t.type === 'deposit' ? 'default' : 'destructive'} className={t.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.description ?? '—'}</TableCell>
              <TableCell className="text-right font-medium">
                <span className={t.type === 'withdrawal' ? 'text-destructive' : 'text-green-600'}>
                  {t.type === 'withdrawal' ? '−' : '+'}RM {Number(t.amount).toFixed(2)}
                </span>
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
