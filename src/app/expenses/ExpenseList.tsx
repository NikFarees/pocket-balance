'use client'

import { deleteExpense, updateExpense } from '@/app/actions/expenses'
import { Amount } from '@/components/Amount'
import { Paginator } from '@/components/Paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { EXPENSE_CATEGORIES } from '@/lib/validation'

const PAGE_SIZE = 5

type Expense = {
  id: string
  amount: number
  description: string
  category: string | null
  expense_date: string
  created_at: string
}

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [viewItem, setViewItem] = useState<Expense | null>(null)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = expenses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleDelete(id: string, description: string) {
    setLoadingId(id)
    const result = await deleteExpense(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success(`"${description}" deleted`)
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await updateExpense(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Expense updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No expenses logged today yet.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((e) => (
          <div
            key={e.id}
            className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setViewItem(e)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{e.description}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), 'h:mm a')}</p>
                {e.category && <Badge variant="secondary" className="text-xs">{e.category}</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm"><Amount value={Number(e.amount)} /></p>
              <div onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  >
                    <Settings2 className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditItem(e)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(e.id, e.description)} disabled={loadingId === e.id}>Delete</DropdownMenuItem>
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
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => setViewItem(e)}>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>
                  {e.category
                    ? <Badge variant="secondary">{e.category}</Badge>
                    : <span className="text-muted-foreground text-sm">—</span>
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(e.created_at), 'h:mm a')}
                </TableCell>
                <TableCell className="text-right font-medium"><Amount value={Number(e.amount)} /></TableCell>
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
                        <DropdownMenuItem onClick={() => setEditItem(e)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(e.id, e.description)} disabled={loadingId === e.id}>Delete</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>Expense Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Description</span><span className="text-sm font-medium">{viewItem.description}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-semibold"><Amount value={Number(viewItem.amount)} /></span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Category</span><span className="text-sm">{viewItem.category ? <Badge variant="secondary">{viewItem.category}</Badge> : '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm">{format(new Date(viewItem.expense_date), 'dd MMM yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="text-sm">{format(new Date(viewItem.created_at), 'h:mm a')}</span></div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
          {editItem && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_desc">Description</Label>
                <Input id="edit_desc" name="description" defaultValue={editItem.description} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_amount">Amount (RM)</Label>
                <Input id="edit_amount" name="amount" type="number" step="0.01" min="0" defaultValue={Number(editItem.amount).toFixed(2)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_cat">Category</Label>
                <select
                  id="edit_cat"
                  name="category"
                  defaultValue={editItem.category ?? ''}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-secondary/60"
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
