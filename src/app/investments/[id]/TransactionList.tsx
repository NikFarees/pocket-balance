'use client'

import { deleteTransaction, updateTransaction } from '@/app/actions/investments'
import { Amount } from '@/components/Amount'
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

const PAGE_SIZE = 5

type Category = 'trading' | 'unit_trust' | 'savings'
type TxType = 'buy' | 'sell' | 'dividend' | 'wallet_topup'

type Transaction = {
  id: string
  type: TxType
  amount: number
  fees: number | null
  asset: string | null
  quantity: number | null
  price_per_unit: number | null
  transaction_date: string
  notes: string | null
}

const TX_LABELS: Record<Category, Record<TxType, string>> = {
  trading:    { wallet_topup: 'Top Up', buy: 'Buy',     sell: 'Sell',     dividend: 'Dividend' },
  unit_trust: { wallet_topup: 'Top Up', buy: 'Save',    sell: 'Redeem',   dividend: 'Dividend' },
  savings:    { wallet_topup: 'Top Up', buy: 'Deposit', sell: 'Withdraw', dividend: 'Dividend' },
}


function TxBadge({ type, category }: { type: TxType; category: Category }) {
  const label = TX_LABELS[category][type]
  if (type === 'wallet_topup') return <Badge className="bg-blue-600 text-white">{label}</Badge>
  if (type === 'buy') return <Badge variant="success">{label}</Badge>
  if (type === 'sell') return <Badge variant="destructive">{label}</Badge>
  return <Badge variant="secondary">{label}</Badge>
}

function txButtonClass(t: TxType, active: TxType) {
  const isActive = t === active
  if (t === 'wallet_topup') return isActive ? 'bg-blue-600 text-white' : 'hover:bg-muted'
  if (t === 'buy') return isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
  if (t === 'sell') return isActive ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'
  return isActive ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
}

const CATEGORY_TX_TYPES: Record<Category, TxType[]> = {
  trading:    ['wallet_topup', 'buy', 'sell'],
  unit_trust: ['buy', 'sell', 'dividend'],
  savings:    ['buy', 'sell', 'dividend'],
}

function formatPrecise(n: number) {
  return parseFloat(n.toFixed(7)).toString()
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
  const [editAmount, setEditAmount] = useState('')
  const [editFees, setEditFees] = useState('')
  const [editAsset, setEditAsset] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = transactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const showQtyPriceCols = category === 'trading' && hasQuantity
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
    setEditAmount(Number(t.amount).toFixed(2))
    setEditFees(t.fees != null ? formatPrecise(Number(t.fees)) : '')
    setEditAsset(t.asset ?? '')
    setEditQty(t.quantity != null ? formatPrecise(Number(t.quantity)) : '')
    setEditPrice(t.price_per_unit != null ? formatPrecise(Number(t.price_per_unit)) : '')
  }

  function editNet(a: string, f: string) {
    const av = parseFloat(a)
    const fv = parseFloat(f) || 0
    return isNaN(av) ? NaN : av - fv
  }

  function recalcEdit(a: string, f: string, q: string, p: string) {
    const n = editNet(a, f)
    if (isNaN(n) || n <= 0) return
    const qv = parseFloat(q)
    const pv = parseFloat(p)
    if (!isNaN(qv) && qv > 0) setEditPrice(String(n / qv))
    else if (!isNaN(pv) && pv > 0) setEditQty(String(n / pv))
  }

  function handleEditAmountChange(val: string) {
    setEditAmount(val)
    recalcEdit(val, editFees, editQty, editPrice)
  }

  function handleEditFeesChange(val: string) {
    setEditFees(val)
    recalcEdit(editAmount, val, editQty, editPrice)
  }

  function handleEditQtyChange(val: string) {
    setEditQty(val)
    const qv = parseFloat(val)
    const n = editNet(editAmount, editFees)
    if (!isNaN(qv) && qv > 0 && !isNaN(n) && n > 0) setEditPrice(String(n / qv))
  }

  function handleEditPriceChange(val: string) {
    setEditPrice(val)
    const pv = parseFloat(val)
    const n = editNet(editAmount, editFees)
    if (!isNaN(pv) && pv > 0 && !isNaN(n) && n > 0) setEditQty(String(n / pv))
  }

  function amountPrefix(type: TxType) {
    return type === 'sell' ? '−' : '+'
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
  }

  const showEditQtyPrice = category === 'trading' && editType !== 'wallet_topup'
  const showEditFees = editType !== 'dividend'
  const showEditAsset = category === 'trading' && editType !== 'wallet_topup'

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
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</p>
                {t.asset && <span className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{t.asset}</span>}
              </div>
              {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`font-semibold text-sm tabular-nums ${t.type === 'sell' ? 'text-destructive' : t.type === 'dividend' ? 'text-muted-foreground' : 'text-success'}`}>
                  <Amount value={Number(t.amount)} sign={amountPrefix(t.type)} />
                </p>
                {t.fees != null && (
                  <p className="text-xs text-muted-foreground">fee <Amount value={Number(t.fees)} /></p>
                )}
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
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Amount (RM)</TableHead>
              <TableHead className="text-right">Fees (RM)</TableHead>
              {showQtyPriceCols && <TableHead className="text-right">Qty</TableHead>}
              {showQtyPriceCols && <TableHead className="text-right">Price/unit</TableHead>}
              <TableHead className="hidden md:table-cell">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setViewItem(t)}>
                <TableCell className="text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</TableCell>
                <TableCell><TxBadge type={t.type} category={category} /></TableCell>
                <TableCell className="text-sm font-medium">
                  {t.asset ? <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-semibold">{t.asset}</span> : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className={t.type === 'sell' ? 'text-destructive' : ''}>
                    <Amount value={Number(t.amount)} sign={amountPrefix(t.type)} />
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {t.fees != null ? <Amount value={Number(t.fees)} /> : '—'}
                </TableCell>
                {showQtyPriceCols && (
                  <TableCell className="text-right text-sm">
                    {t.quantity != null ? formatPrecise(Number(t.quantity)) : '—'}
                  </TableCell>
                )}
                {showQtyPriceCols && (
                  <TableCell className="text-right text-sm">
                    {t.price_per_unit != null ? <Amount value={Number(t.price_per_unit)} formatter={n => parseFloat(n.toFixed(7)).toString()} /> : '—'}
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
              {viewItem.asset && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Asset</span><span className="text-sm font-semibold">{viewItem.asset}</span></div>
              )}
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span>
                <span className={`text-sm font-semibold ${viewItem.type === 'sell' ? 'text-destructive' : ''}`}>
                  <Amount value={Number(viewItem.amount)} sign={amountPrefix(viewItem.type)} />
                </span>
              </div>
              {viewItem.fees != null && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Fees Paid</span><span className="text-sm text-muted-foreground"><Amount value={Number(viewItem.fees)} /></span></div>
              )}
              {viewItem.fees != null && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Net (after fees)</span><span className="text-sm font-medium"><Amount value={Number(viewItem.amount) - Number(viewItem.fees)} /></span></div>
              )}
              {viewItem.quantity != null && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Quantity</span><span className="text-sm">{formatPrecise(Number(viewItem.quantity))}</span></div>
              )}
              {viewItem.price_per_unit != null && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Price / Unit</span><span className="text-sm"><Amount value={Number(viewItem.price_per_unit)} formatter={n => parseFloat(n.toFixed(7)).toString()} /></span></div>
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

              {showEditAsset && (
                <div className="space-y-2">
                  <Label htmlFor="edit_asset">Asset / Ticker <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="edit_asset" name="asset" type="text"
                    placeholder="e.g. ETH"
                    value={editAsset}
                    onChange={e => setEditAsset(e.target.value.toUpperCase())}
                    className="w-40 uppercase"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tx_amount">Amount (RM)</Label>
                  <Input
                    id="tx_amount" name="amount" type="text" inputMode="decimal" required
                    value={editAmount}
                    onChange={e => handleEditAmountChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx_date">Date</Label>
                  <Input id="tx_date" name="transaction_date" type="date" defaultValue={editItem.transaction_date} required />
                </div>
                {showEditFees && (
                  <div className="space-y-2">
                    <Label htmlFor="tx_fees">Fees Paid (RM) <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="tx_fees" name="fees" type="text" inputMode="decimal"
                      placeholder="0.00"
                      value={editFees}
                      onChange={e => handleEditFeesChange(e.target.value)}
                    />
                  </div>
                )}
                {showEditFees && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Net (after fees)</Label>
                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm tabular-nums">
                      {(() => { const n = editNet(editAmount, editFees); return (!isNaN(n) && editAmount) ? `RM ${n.toFixed(2)}` : '—' })()}
                    </div>
                  </div>
                )}
                {showEditQtyPrice && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tx_qty">Quantity <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        id="tx_qty" name="quantity" type="text" inputMode="decimal"
                        placeholder="e.g. 1.5"
                        value={editQty}
                        onChange={e => handleEditQtyChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tx_price">Price/unit <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        id="tx_price" name="price_per_unit" type="text" inputMode="decimal"
                        placeholder="e.g. 380.00"
                        value={editPrice}
                        onChange={e => handleEditPriceChange(e.target.value)}
                      />
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
