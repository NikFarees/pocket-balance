'use client'

import { deleteBackupTransaction, updateBackupTransaction } from '@/app/actions/backup'
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

type Transaction = {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  description: string | null
  location: string | null
  transaction_date: string
}

export function BackupHistory({ transactions }: { transactions: Transaction[] }) {
  const [viewTx, setViewTx] = useState<Transaction | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editType, setEditType] = useState<'deposit' | 'withdrawal'>('deposit')
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
    const result = await deleteBackupTransaction(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Transaction deleted')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editTx) return
    setEditLoading(true)
    const result = await updateBackupTransaction(editTx.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Transaction updated')
      setEditTx(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  function openEdit(t: Transaction) {
    setEditTx(t)
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
            onClick={() => setViewTx(t)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{t.description ?? (t.type === 'deposit' ? 'Deposit' : 'Withdrawal')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(t.transaction_date), 'dd MMM yyyy')}
                {t.location && <> · {t.location}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`font-semibold text-sm ${t.type === 'deposit' ? 'text-green-600' : 'text-destructive'}`}>
                  {t.type === 'deposit' ? '+' : '−'}RM {Number(t.amount).toFixed(2)}
                </p>
                <div className="mt-0.5">
                  <Badge variant={t.type === 'deposit' ? 'default' : 'destructive'}
                    className={`text-xs ${t.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                    {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Badge>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
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
              <TableHead>Location</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setViewTx(t)}>
                <TableCell className="text-sm">{format(parseISO(t.transaction_date), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={t.type === 'deposit' ? 'default' : 'destructive'}
                    className={t.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}>
                    {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.location ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.description ?? '—'}</TableCell>
                <TableCell className="text-right font-medium">
                  <span className={t.type === 'withdrawal' ? 'text-destructive' : 'text-green-600'}>
                    {t.type === 'withdrawal' ? '−' : '+'}RM {Number(t.amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
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

      {/* View detail modal (no delete) */}
      <Dialog open={!!viewTx} onOpenChange={(open) => { if (!open) setViewTx(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transaction Detail</DialogTitle></DialogHeader>
          {viewTx && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant={viewTx.type === 'deposit' ? 'default' : 'destructive'}
                  className={viewTx.type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {viewTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className={`font-semibold ${viewTx.type === 'deposit' ? 'text-green-600' : 'text-destructive'}`}>
                  {viewTx.type === 'deposit' ? '+' : '−'}RM {Number(viewTx.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm">{format(parseISO(viewTx.transaction_date), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm">{viewTx.location ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Notes</span>
                <span className="text-sm">{viewTx.description ?? '—'}</span>
              </div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewTx(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editTx} onOpenChange={(open) => { if (!open) setEditTx(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          {editTx && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden w-fit">
                <button type="button" onClick={() => setEditType('deposit')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${editType === 'deposit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  Deposit
                </button>
                <button type="button" onClick={() => setEditType('withdrawal')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${editType === 'withdrawal' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}>
                  Withdrawal
                </button>
              </div>
              <input type="hidden" name="type" value={editType} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bk_amount">Amount (RM)</Label>
                  <Input id="bk_amount" name="amount" type="number" step="0.01" min="0" defaultValue={Number(editTx.amount).toFixed(2)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bk_date">Date</Label>
                  <Input id="bk_date" name="transaction_date" type="date" defaultValue={editTx.transaction_date} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk_location">Location <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="bk_location" name="location" defaultValue={editTx.location ?? ''} placeholder="e.g. TNG Go+, Maybank, Cash" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk_desc">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="bk_desc" name="description" defaultValue={editTx.description ?? ''} placeholder="e.g. Monthly savings, Go+ dividends" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditTx(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading} variant={editType === 'withdrawal' ? 'destructive' : 'default'}>
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
