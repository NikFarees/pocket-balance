'use client'

import { deleteTransaction, updateTransaction } from '@/app/actions/investments'
import { Paginator } from '@/components/Paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

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
  const [viewItem, setViewItem] = useState<Transaction | null>(null)
  const [editItem, setEditItem] = useState<Transaction | null>(null)
  const [editType, setEditType] = useState<'buy' | 'sell'>('buy')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteTransaction(id, investmentId)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Transaction deleted')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await updateTransaction(editItem.id, investmentId, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Transaction updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  function openEdit(t: Transaction) {
    setEditItem(t)
    setEditType(t.type)
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setViewItem(t)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</p>
              {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`font-semibold text-sm ${t.type === 'buy' ? 'text-green-600' : 'text-destructive'}`}>
                  {t.type === 'buy' ? '+' : '−'}RM {Number(t.amount).toFixed(2)}
                </p>
                <div className="mt-0.5">
                  <Badge variant={t.type === 'buy' ? 'default' : 'destructive'}
                    className={`text-xs ${t.type === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                    {t.type === 'buy' ? 'Buy' : 'Sell'}
                  </Badge>
                </div>
              </div>
              <div onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  >
                    <Settings2 className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(t.id)} disabled={loadingId === t.id}>Delete</DropdownMenuItem>
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
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount (RM)</TableHead>
              {hasQuantity && <TableHead className="text-right">Qty</TableHead>}
              {hasQuantity && <TableHead className="text-right">Price/unit</TableHead>}
              <TableHead className="hidden md:table-cell">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setViewItem(t)}>
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
                  <TableCell className="text-right text-sm">
                    {t.quantity ? Number(t.quantity).toFixed(4) : '—'}
                  </TableCell>
                )}
                {hasQuantity && (
                  <TableCell className="text-right text-sm">
                    {t.price_per_unit ? `RM ${Number(t.price_per_unit).toFixed(2)}` : '—'}
                  </TableCell>
                )}
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{t.notes ?? '—'}</TableCell>
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(ev) => ev.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Settings2 className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(t.id)} disabled={loadingId === t.id}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* View detail modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transaction Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm">{format(parseISO(viewItem.transaction_date), 'dd MMM yyyy')}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Type</span>
                <Badge variant={viewItem.type === 'buy' ? 'default' : 'destructive'} className={viewItem.type === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {viewItem.type === 'buy' ? 'Buy' : 'Sell'}
                </Badge>
              </div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span>
                <span className={`text-sm font-semibold ${viewItem.type === 'sell' ? 'text-destructive' : ''}`}>
                  {viewItem.type === 'sell' ? '−' : '+'}RM {Number(viewItem.amount).toFixed(2)}
                </span>
              </div>
              {viewItem.quantity !== null && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Quantity</span><span className="text-sm">{Number(viewItem.quantity).toFixed(4)}</span></div>
              )}
              {viewItem.price_per_unit !== null && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Price / Unit</span><span className="text-sm">RM {Number(viewItem.price_per_unit).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm">{viewItem.notes ?? '—'}</span></div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          {editItem && (
            <form ref={editFormRef} action={handleEdit} className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden w-fit">
                <button type="button" onClick={() => setEditType('buy')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${editType === 'buy' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  Buy / Deposit
                </button>
                <button type="button" onClick={() => setEditType('sell')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${editType === 'sell' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}>
                  Sell / Withdraw
                </button>
              </div>
              <input type="hidden" name="type" value={editType} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tx_amount">Amount (RM)</Label>
                  <Input id="tx_amount" name="amount" type="number" step="0.01" min="0" defaultValue={Number(editItem.amount).toFixed(2)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx_date">Date</Label>
                  <Input id="tx_date" name="transaction_date" type="date" defaultValue={editItem.transaction_date} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx_qty">Quantity <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="tx_qty" name="quantity" type="number" step="0.000001" min="0" defaultValue={editItem.quantity ?? ''} placeholder="e.g. 1.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx_price">Price/unit <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="tx_price" name="price_per_unit" type="number" step="0.0001" min="0" defaultValue={editItem.price_per_unit ?? ''} placeholder="e.g. 380.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="tx_notes" name="notes" defaultValue={editItem.notes ?? ''} placeholder="optional" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading} variant={editType === 'sell' ? 'destructive' : 'default'}>{editLoading ? 'Saving…' : 'Save'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
