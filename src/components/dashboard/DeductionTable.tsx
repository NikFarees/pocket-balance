'use client'

import { markDeductionPaid, unmarkDeductionPaid } from '@/app/actions/dashboard'
import { Amount } from '@/components/Amount'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type DashboardDeduction = {
  id: string
  name: string
  expected_amount: number
  due_date: number | null
  category: string | null
  isPaid: boolean
  payment: { id: string; paid_amount: number; payment_date: string } | null
}

function DeductionRowActions({ deduction, className }: { deduction: DashboardDeduction; className?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleMarkPaid() {
    setLoading(true)
    const result = await markDeductionPaid(deduction.id, deduction.expected_amount)
    if (result.error) toast.error(result.error)
    else { toast.success(`${deduction.name} marked as paid`); router.refresh() }
    setLoading(false)
  }

  async function handleUnmark() {
    if (!deduction.payment) return
    setLoading(true)
    const result = await unmarkDeductionPaid(deduction.payment.id)
    if (result.error) toast.error(result.error)
    else { toast.success(`${deduction.name} unmarked`); router.refresh() }
    setLoading(false)
  }

  return deduction.isPaid ? (
    <Button variant="outline" size="sm" className={className} onClick={handleUnmark} disabled={loading}>
      {loading ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Undoing…</> : 'Undo'}
    </Button>
  ) : (
    <Button variant="outline" size="sm" className={className} onClick={handleMarkPaid} disabled={loading}>
      {loading ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Marking…</> : 'Mark Paid'}
    </Button>
  )
}

export function DeductionTable({ deductions }: { deductions: DashboardDeduction[] }) {
  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {deductions.map((d) => (
          <div key={d.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{d.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {d.category && <span className="text-xs text-muted-foreground">{d.category}</span>}
                  {d.due_date && <span className="text-xs text-muted-foreground">Due {d.due_date}th</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-sm"><Amount value={Number(d.expected_amount)} /></p>
                <div className="mt-0.5">
                  {d.isPaid
                    ? <Badge variant="success" className="text-xs">Paid</Badge>
                    : <Badge variant="secondary" className="text-xs">Unpaid</Badge>
                  }
                </div>
              </div>
            </div>
            {d.isPaid && d.payment && (
              <p className="text-xs text-muted-foreground mb-2">
                Paid <Amount value={Number(d.payment.paid_amount)} /> on {format(parseISO(d.payment.payment_date), 'dd MMM')}
              </p>
            )}
            <div onClick={e => e.stopPropagation()}>
              <DeductionRowActions deduction={d} className="text-xs h-7 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deductions.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium">{d.name}</div>
                  {d.category && <div className="text-xs text-muted-foreground mt-0.5">{d.category}</div>}
                </TableCell>
                <TableCell>{d.due_date ? `${d.due_date}th` : '—'}</TableCell>
                <TableCell className="text-right font-medium"><Amount value={Number(d.expected_amount)} /></TableCell>
                <TableCell>
                  {d.isPaid
                    ? <Badge variant="success">Paid</Badge>
                    : <Badge variant="secondary">Unpaid</Badge>
                  }
                </TableCell>
                <TableCell className="text-right text-sm">
                  {d.payment ? (
                    <div>
                      <div><Amount value={Number(d.payment.paid_amount)} /></div>
                      <div className="text-xs text-muted-foreground">{format(parseISO(d.payment.payment_date), 'dd MMM')}</div>
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <DeductionRowActions deduction={d} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
