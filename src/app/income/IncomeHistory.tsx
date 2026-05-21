'use client'

import { deleteIncome, updateIncome } from '@/app/actions/income'
import { Paginator } from '@/components/Paginator'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type Income = {
  id: string
  amount: number
  source: string
  income_date: string
  notes: string | null
}

function fmtAmt(amount: number) {
  const abs = Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })
  return amount < 0 ? `-RM ${abs}` : `RM ${abs}`
}

export function IncomeHistory({ incomes }: { incomes: Income[] }) {
  const [viewItem, setViewItem] = useState<Income | null>(null)
  const [editItem, setEditItem] = useState<Income | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editType, setEditType] = useState<'income' | 'adjustment'>('income')
  const [page, setPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(incomes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = incomes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function openEdit(item: Income) {
    setEditType(Number(item.amount) < 0 ? 'adjustment' : 'income')
    setEditItem(item)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteIncome(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Entry deleted')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const rawAmount = parseFloat(formData.get('amount') as string)
    const signedAmount = editType === 'adjustment' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
    formData.set('amount', String(signedAmount))
    const result = await updateIncome(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Entry updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (incomes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No entries yet. Add one above.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setViewItem(item)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{item.source}</p>
              <p className="text-xs text-muted-foreground">{format(parseISO(item.income_date), 'd MMM yyyy')}</p>
              {item.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className={cn('font-semibold text-sm', Number(item.amount) < 0 && 'text-destructive')}>{fmtAmt(Number(item.amount))}</p>
              <div onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                    <Settings2 className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item.id)} disabled={loadingId === item.id}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => setViewItem(item)}>
                <TableCell className="font-medium">{format(parseISO(item.income_date), 'd MMM yyyy')}</TableCell>
                <TableCell>{item.source}</TableCell>
                <TableCell className={cn('text-right', Number(item.amount) < 0 && 'text-destructive')}>{fmtAmt(Number(item.amount))}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.notes ?? '—'}</TableCell>
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={(ev) => ev.stopPropagation()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <Settings2 className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item.id)} disabled={loadingId === item.id}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* View dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Income Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm font-medium">{format(parseISO(viewItem.income_date), 'd MMM yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Source</span><span className="text-sm font-medium">{viewItem.source}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className={cn('text-sm font-semibold', Number(viewItem.amount) < 0 && 'text-destructive')}>{fmtAmt(Number(viewItem.amount))}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm">{viewItem.notes ?? '—'}</span></div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Entry</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={cn('flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors', editType === 'income' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted')}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('adjustment')}
                  className={cn('flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors', editType === 'adjustment' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-input bg-background text-muted-foreground hover:bg-muted')}
                >
                  Adjustment
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Amount (RM)</Label>
                  <Input
                    id="edit_amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={Math.abs(Number(editItem.amount)).toFixed(2)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_income_date">Date</Label>
                  <Input
                    id="edit_income_date"
                    name="income_date"
                    type="date"
                    defaultValue={editItem.income_date}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_source">Source</Label>
                <Input id="edit_source" name="source" defaultValue={editItem.source} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea id="edit_notes" name="notes" defaultValue={editItem.notes ?? ''} rows={2} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
