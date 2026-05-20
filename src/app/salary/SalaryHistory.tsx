'use client'

import { deleteSalary, upsertSalary } from '@/app/actions/salary'
import { Paginator } from '@/components/Paginator'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import { Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 10

type Salary = {
  id: string
  amount: number
  month: string
  notes: string | null
}

export function SalaryHistory({ salaries }: { salaries: Salary[] }) {
  const [viewItem, setViewItem] = useState<Salary | null>(null)
  const [editItem, setEditItem] = useState<Salary | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(salaries.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = salaries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteSalary(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Salary entry deleted')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await upsertSalary(formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Salary updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (salaries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No salary entries yet. Add one above.</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden sm:table-cell">Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((s) => (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => setViewItem(s)}>
              <TableCell className="font-medium">{format(parseISO(s.month), 'MMMM yyyy')}</TableCell>
              <TableCell className="text-right">RM {Number(s.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{s.notes ?? '—'}</TableCell>
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
                      <DropdownMenuItem onClick={() => setEditItem(s)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(s.id)} disabled={loadingId === s.id}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* View detail modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salary Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Month</span><span className="text-sm font-medium">{format(parseISO(viewItem.month), 'MMMM yyyy')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-semibold">RM {Number(viewItem.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm">{viewItem.notes ?? '—'}</span></div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Salary</DialogTitle></DialogHeader>
          {editItem && (
            <form ref={editFormRef} action={handleEdit} className="space-y-4">
              <input type="hidden" name="month" value={editItem.month.slice(0, 7)} />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Month</p>
                <p className="font-medium">{format(parseISO(editItem.month), 'MMMM yyyy')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sedit_amount">Amount (RM)</Label>
                <Input id="sedit_amount" name="amount" type="number" step="0.01" min="0" defaultValue={Number(editItem.amount).toFixed(2)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sedit_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="sedit_notes" name="notes" defaultValue={editItem.notes ?? ''} placeholder="optional" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? 'Saving…' : 'Save'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
