'use client'

import { deleteExpense, updateExpense } from '@/app/actions/expenses'
import { Amount } from '@/components/Amount'
import { Paginator } from '@/components/Paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Loader2, Settings2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 5

type Expense = {
  id: string
  amount: number
  description: string
  category: string | null
  expense_date: string
  created_at: string
}

export function AllExpensesCard({ expenses }: { expenses: Expense[] }) {
  const [filterDate, setFilterDate] = useState('')
  const [page, setPage] = useState(1)
  const [viewItem, setViewItem] = useState<Expense | null>(null)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const filtered = filterDate ? expenses.filter(e => e.expense_date === filterDate) : expenses
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const filteredTotal = filtered.reduce((sum, e) => sum + Number(e.amount), 0)

  function handleDateChange(date: string) {
    setFilterDate(date)
    setPage(1)
  }

  async function handleDelete(id: string, description: string) {
    setLoadingId(id)
    const result = await deleteExpense(id)
    if (result.error) toast.error(result.error)
    else { toast.success(`"${description}" deleted`); router.refresh() }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await updateExpense(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else { toast.success('Expense updated'); setEditItem(null); router.refresh() }
    setEditLoading(false)
  }

  return (
    <Card>
      <CardHeader className="py-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Expenses History</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · <Amount value={filteredTotal} />
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filterDate && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleDateChange('')}>
                <X className="size-3 mr-1" />Clear
              </Button>
            )}
            <Input
              type="date"
              value={filterDate}
              onChange={e => handleDateChange(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {filterDate ? 'No expenses on this date.' : 'No expenses this month yet.'}
          </p>
        ) : (
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
                      <p className="text-xs text-muted-foreground">{format(parseISO(e.expense_date), 'dd MMM')}</p>
                      {e.category && <Badge variant="secondary" className="text-xs">{e.category}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm"><Amount value={Number(e.amount)} /></p>
                    <div onClick={(ev) => ev.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
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
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((e) => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => setViewItem(e)}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(e.expense_date), 'dd MMM')}
                      </TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell>
                        {e.category ? <Badge variant="secondary">{e.category}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium"><Amount value={Number(e.amount)} /></TableCell>
                      <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger onClick={(ev) => ev.stopPropagation()} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            <Settings2 className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditItem(e)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(e.id, e.description)} disabled={loadingId === e.id}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </CardContent>

      {/* View detail modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Expense Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Description</span><span className="text-sm font-medium">{viewItem.description}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-semibold"><Amount value={Number(viewItem.amount)} /></span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Category</span><span className="text-sm">{viewItem.category ? <Badge variant="secondary">{viewItem.category}</Badge> : '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm">{format(parseISO(viewItem.expense_date), 'dd MMM yyyy')}</span></div>
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
                <Label htmlFor="aedit_desc">Description</Label>
                <Input id="aedit_desc" name="description" defaultValue={editItem.description} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aedit_amount">Amount (RM)</Label>
                <Input id="aedit_amount" name="amount" type="number" step="0.01" min="0" defaultValue={Number(editItem.amount).toFixed(2)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aedit_cat">Category <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="aedit_cat" name="category" defaultValue={editItem.category ?? ''} placeholder="optional" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
