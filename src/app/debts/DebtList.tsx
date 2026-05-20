'use client'

import { deleteDebt, settleDebt, unsettleDebt, updateDebt } from '@/app/actions/debts'
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

type Debt = {
  id: string
  type: 'i_owe' | 'they_owe'
  person_name: string
  description: string | null
  amount: number
  due_date: string | null
  is_settled: boolean
  settled_date: string | null
}

const PAGE_SIZE = 10

export function DebtList({ debts, emptyMessage }: { debts: Debt[]; emptyMessage: string }) {
  const [viewItem, setViewItem] = useState<Debt | null>(null)
  const [editItem, setEditItem] = useState<Debt | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(debts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = debts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleSettle(id: string, isSettled: boolean) {
    setLoadingId(id)
    const result = isSettled ? await unsettleDebt(id) : await settleDebt(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success(isSettled ? 'Marked as unpaid' : 'Marked as settled')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteDebt(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Deleted')
      setEditItem(null)
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await updateDebt(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (debts.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((d) => (
          <div
            key={d.id}
            className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${d.is_settled ? 'opacity-50' : ''}`}
            onClick={() => setViewItem(d)}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{d.person_name}</p>
                {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                {d.due_date && <p className="text-xs text-muted-foreground mt-0.5">Due {format(parseISO(d.due_date), 'dd MMM yyyy')}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-sm">RM {Number(d.amount).toFixed(2)}</p>
                <div className="mt-0.5">
                  {d.is_settled
                    ? <Badge variant="outline" className="text-muted-foreground text-xs">Settled</Badge>
                    : <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">Pending</Badge>
                  }
                </div>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1"
                onClick={() => handleSettle(d.id, d.is_settled)} disabled={loadingId === d.id}>
                {d.is_settled ? 'Undo' : 'Settle'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-7 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent text-xs"
                >
                  <Settings2 className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditItem(d)}>Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(d.id)} disabled={loadingId === d.id}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((d) => (
              <TableRow key={d.id} className={`cursor-pointer ${d.is_settled ? 'opacity-50' : ''}`} onClick={() => setViewItem(d)}>
                <TableCell className="font-medium">{d.person_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.description ?? '—'}</TableCell>
                <TableCell className="text-right font-medium">RM {Number(d.amount).toFixed(2)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.due_date ? format(parseISO(d.due_date), 'dd MMM yyyy') : '—'}
                </TableCell>
                <TableCell>
                  {d.is_settled
                    ? <Badge variant="outline" className="text-muted-foreground">Settled</Badge>
                    : <Badge className="bg-orange-500 hover:bg-orange-600">Pending</Badge>
                  }
                </TableCell>
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
                        <DropdownMenuItem onClick={() => handleSettle(d.id, d.is_settled)} disabled={loadingId === d.id}>
                          {d.is_settled ? 'Undo Settle' : 'Settle'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditItem(d)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(d.id)} disabled={loadingId === d.id}>Delete</DropdownMenuItem>
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
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Debt Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Person</span><span className="text-sm font-medium">{viewItem.person_name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Description</span><span className="text-sm">{viewItem.description ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-semibold">RM {Number(viewItem.amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Due Date</span><span className="text-sm">{viewItem.due_date ? format(parseISO(viewItem.due_date), 'dd MMM yyyy') : '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Status</span>
                {viewItem.is_settled
                  ? <Badge variant="outline" className="text-muted-foreground">Settled</Badge>
                  : <Badge className="bg-orange-500 hover:bg-orange-600">Pending</Badge>
                }
              </div>
              {viewItem.settled_date && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Settled On</span><span className="text-sm">{format(parseISO(viewItem.settled_date), 'dd MMM yyyy')}</span></div>
              )}
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Debt</DialogTitle></DialogHeader>
          {editItem && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="edit_person">Person</Label>
                  <Input id="edit_person" name="person_name" defaultValue={editItem.person_name} required />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="edit_amount">Amount (RM)</Label>
                  <Input id="edit_amount" name="amount" type="number" step="0.01" min="0" defaultValue={Number(editItem.amount).toFixed(2)} required />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="edit_desc">Description <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="edit_desc" name="description" defaultValue={editItem.description ?? ''} placeholder="e.g. Lunch" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="edit_due">Due Date <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="edit_due" name="due_date" type="date" defaultValue={editItem.due_date ?? ''} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(editItem.id)} disabled={!!loadingId || editLoading}>
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                  <Button type="submit" disabled={editLoading}>{editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}</Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
