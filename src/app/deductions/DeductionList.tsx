'use client'

import { deleteDeduction, toggleDeduction, updateDeduction } from '@/app/actions/deductions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { DeductionForm } from './DeductionForm'

type Deduction = {
  id: string
  name: string
  expected_amount: number
  due_date: number | null
  category: string | null
  is_active: boolean
}

export function DeductionList({ deductions }: { deductions: Deduction[] }) {
  const [viewItem, setViewItem] = useState<Deduction | null>(null)
  const [editItem, setEditItem] = useState<Deduction | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleToggle(id: string, current: boolean) {
    setLoadingId(id)
    const result = await toggleDeduction(id, !current)
    if (result.error) toast.error(result.error)
    else router.refresh()
    setLoadingId(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also remove all payment history for it.`)) return
    setLoadingId(id)
    const result = await deleteDeduction(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success(`${name} deleted`)
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await updateDeduction(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Deduction updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (deductions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No deductions yet. Add one above.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {deductions.map((d) => (
          <div
            key={d.id}
            className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${!d.is_active ? 'opacity-50' : ''}`}
            onClick={() => setViewItem(d)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{d.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {d.category && <p className="text-xs text-muted-foreground">{d.category}</p>}
                {d.due_date && <p className="text-xs text-muted-foreground">Due {d.due_date}th</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-semibold text-sm">RM {Number(d.expected_amount).toFixed(2)}</p>
                <div className="mt-0.5">
                  {d.is_active ? <Badge variant="default" className="text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">Inactive</Badge>}
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
                    <DropdownMenuItem onClick={() => setEditItem(d)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggle(d.id, d.is_active)} disabled={loadingId === d.id}>
                      {d.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(d.id, d.name)} disabled={loadingId === d.id}>Delete</DropdownMenuItem>
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
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deductions.map((d) => (
              <TableRow key={d.id} className={`cursor-pointer ${!d.is_active ? 'opacity-50' : ''}`} onClick={() => setViewItem(d)}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.category ?? '—'}</TableCell>
                <TableCell className="text-sm">{d.due_date ? `${d.due_date}th` : '—'}</TableCell>
                <TableCell className="text-right">RM {Number(d.expected_amount).toFixed(2)}</TableCell>
                <TableCell>
                  {d.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
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
                        <DropdownMenuItem onClick={() => setEditItem(d)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(d.id, d.is_active)} disabled={loadingId === d.id}>
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(d.id, d.name)} disabled={loadingId === d.id}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View detail modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deduction Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-medium">{viewItem.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Category</span><span className="text-sm">{viewItem.category ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Expected Amount</span><span className="text-sm font-semibold">RM {Number(viewItem.expected_amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Due Date</span><span className="text-sm">{viewItem.due_date ? `${viewItem.due_date}th of month` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span>{viewItem.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</span></div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Deduction</DialogTitle></DialogHeader>
          {editItem && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="ded_name">Name</Label>
                  <Input id="ded_name" name="name" defaultValue={editItem.name} required />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="ded_amount">Amount (RM)</Label>
                  <Input id="ded_amount" name="expected_amount" type="number" step="0.01" min="0" defaultValue={Number(editItem.expected_amount).toFixed(2)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ded_due">Due Date <span className="text-muted-foreground">(day, optional)</span></Label>
                  <Input id="ded_due" name="due_date" type="number" min="1" max="31" defaultValue={editItem.due_date ?? ''} placeholder="e.g. 15" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ded_cat">Category <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="ded_cat" name="category" defaultValue={editItem.category ?? ''} placeholder="e.g. Transport" />
                </div>
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
