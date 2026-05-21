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
import { Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type Category = 'trading' | 'unit_trust' | 'savings'
type TxType = 'buy' | 'sell' | 'dividend'

type Transaction = {
  id: string
  type: TxType
  amount: number
  quantity: number | null
  price_per_unit: number | null
  transaction_date: string
  notes: string | null
}

const TX_LABELS: Record<Category, Record<TxType, string>> = {
  trading:    { buy: 'Buy',     sell: 'Sell',     dividend: 'Dividend' },
  unit_trust: { buy: 'Save',    sell: 'Redeem',   dividend: 'Dividend' },
  savings:    { buy: 'Deposit', sell: 'Withdraw', dividend: 'Dividend' },
}

const TX_SUCCESS: Record<Category, Record<TxType, string>> = {
  trading:    { buy: 'Purchase',   sell: 'Sale',        dividend: 'Dividend' },
  unit_trust: { buy: 'Saving',     sell: 'Redemption',  dividend: 'Dividend' },
  savings:    { buy: 'Deposit',    sell: 'Withdrawal',  dividend: 'Dividend' },
}

function TxBadge({ type, category }: { type: TxType; category: Category }) {
  const label = TX_LABELS[category][type]
  if (type === 'buy') return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{label}</Badge>
  if (type === 'sell') return <Badge variant="destructive">{label}</Badge>
  return <Badge variant="secondary">{label}</Badge>
}

function txButtonClass(t: TxType, active: TxType) {
  const isActive = t === active
  if (t === 'buy') return isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
  if (t === 'sell') return isActive ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'
  return isActive ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
}

const CATEGORY_TX_TYPES: Record<Category, TxType[]> = {
  trading:    ['buy', 'sell'],
  unit_trust: ['buy', 'sell', 'dividend'],
  savings:    ['buy', 'sell', 'dividend'],
}

export function TransactionList({
  transactions,
  investmentId,
  hasQuantity,
  category,
}: {
  transactions: Transaction[]
  investmentId: string
  hasQuantity: boolean
  category: Category
}) {
  const [viewItem, setViewItem] = useState<Transaction | null>(null)
  const [editItem, setEditItem] = useState<Transaction | null>(null)
  const [editType, setEditType] = useState<TxType>('buy')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const showQtyPrice = category === 'trading' && hasQuantity
  const availableTypes = CATEGORY_TX_TYPES[category]

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

  function amountPrefix(type: TxType) {
    return type === 'sell' ? '−' : '+'
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
                <p className={`font-semibold text-sm ${t.type === 'sell' ? 'text-destructive' : t.type === 'dividend' ? 'text-muted-foreground' : 'text-green-600'}`}>
                  {amountPrefix(t.type)}RM {Number(t.amount).toFixed(2)}
                </p>
                <div className="mt-0.5">
                  <TxBadge type={t.type} category={category} />
                </div>
              </div>
              <div onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
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
              {showQtyPrice && <TableHead className="text-right">Qty</TableHead>}
              {showQtyPrice && <TableHead className="text-right">Price/unit</TableHead>}
              <TableHead className="hidden md:table-cell">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setViewItem(t)}>
                <TableCell className="text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</TableCell>
                <TableCell><TxBadge type={t.type} category={category} /></TableCell>
                <TableCell className="text-right font-medium">
                  <span className={t.type === 'sell' ? 'text-destructive' : ''}>
                    {amountPrefix(t.type)}RM {Number(t.amount).toFixed(2)}
                  </span>
                </TableCell>
                {showQtyPrice && (
                  <TableCell className="text-right text-sm">
                    {t.quantity ? Number(t.quantity).toFixed(4) : '—'}
                  </TableCell>
                )}
                {showQtyPrice && (
                  <TableCell className="text-right text-sm">
                    {t.price_per_unit ? `RM ${Number(t.price_per_unit).toFixed(2)}` : '—'}
                  </TableCell>
                )}
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{t.notes ?? '—'}</TableCell>
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
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
                <TxBadge type={viewItem.type} category={category} />
              </div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span>
                <span className={`text-sm font-semibold ${viewItem.type === 'sell' ? 'text-destructive' : ''}`}>
                  {amountPrefix(viewItem.type)}RM {Number(viewItem.amount).toFixed(2)}
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
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden w-fit">
                {availableTypes.map(t => (
                  <button key={t} type="button" onClick={() => setEditType(t)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${txButtonClass(t, editType)}`}>
                    {TX_LABELS[category][t]}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={editType} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tx_amount">Amount (RM)</Label>
                  <Input id="tx_amount" name="amount" type="text" inputMode="decimal" defaultValue={Number(editItem.amount).toFixed(2)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx_date">Date</Label>
                  <Input id="tx_date" name="transaction_date" type="date" defaultValue={editItem.transaction_date} required />
                </div>
                {category === 'trading' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tx_qty">Quantity <span className="text-muted-foreground">(optional)</span></Label>
                      <Input id="tx_qty" name="quantity" type="number" step="0.000001" min="0" defaultValue={editItem.quantity ?? ''} placeholder="e.g. 1.5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tx_price">Price/unit <span className="text-muted-foreground">(optional)</span></Label>
                      <Input id="tx_price" name="price_per_unit" type="number" step="0.0001" min="0" defaultValue={editItem.price_per_unit ?? ''} placeholder="e.g. 380.00" />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="tx_notes" name="notes" defaultValue={editItem.notes ?? ''} placeholder="optional" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading} variant={editType === 'sell' ? 'destructive' : 'default'}>
                  {editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
