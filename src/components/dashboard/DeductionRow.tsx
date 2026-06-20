'use client'

import { markDeductionPaid, unmarkDeductionPaid } from '@/app/actions/dashboard'
import { Amount } from '@/components/Amount'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  deduction: {
    id: string
    name: string
    expected_amount: number
    due_date: number | null
    category: string | null
    isPaid: boolean
    payment: { id: string; paid_amount: number; payment_date: string } | null
  }
}

export function DeductionRow({ deduction }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleMarkPaid() {
    setLoading(true)
    const result = await markDeductionPaid(deduction.id, deduction.expected_amount)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${deduction.name} marked as paid`)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleUnmark() {
    if (!deduction.payment) return
    setLoading(true)
    const result = await unmarkDeductionPaid(deduction.payment.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${deduction.name} unmarked`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{deduction.name}</div>
        {deduction.category && (
          <div className="text-xs text-muted-foreground mt-0.5">{deduction.category}</div>
        )}
      </TableCell>
      <TableCell>
        {deduction.due_date ? `${deduction.due_date}th` : '—'}
      </TableCell>
      <TableCell className="text-right font-medium">
        <Amount value={Number(deduction.expected_amount)} />
      </TableCell>
      <TableCell>
        {deduction.isPaid ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Paid</Badge>
        ) : (
          <Badge variant="secondary">Unpaid</Badge>
        )}
      </TableCell>
      <TableCell className="text-right text-sm hidden sm:table-cell">
        {deduction.payment ? (
          <div>
            <div><Amount value={Number(deduction.payment.paid_amount)} /></div>
            <div className="text-xs text-muted-foreground">
              {format(parseISO(deduction.payment.payment_date), 'dd MMM')}
            </div>
          </div>
        ) : '—'}
      </TableCell>
      <TableCell className="text-right">
        {deduction.isPaid ? (
          <Button variant="ghost" size="sm" onClick={handleUnmark} disabled={loading}>
            Undo
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleMarkPaid} disabled={loading}>
            Mark Paid
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
