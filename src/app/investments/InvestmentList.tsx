'use client'

import { deleteInvestment, toggleInvestment, updateInvestment } from '@/app/actions/investments'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Loader2, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

type Investment = {
  id: string
  name: string
  type: string | null
  notes: string | null
  is_active: boolean
}

export function InvestmentList({ investments }: { investments: Investment[] }) {
  const [viewItem, setViewItem] = useState<Investment | null>(null)
  const [editItem, setEditItem] = useState<Investment | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleToggle(id: string, current: boolean) {
    setLoadingId(id)
    const result = await toggleInvestment(id, !current)
    if (result.error) toast.error(result.error)
    else router.refresh()
    setLoadingId(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All transaction records will be lost.`)) return
    setLoadingId(id)
    const result = await deleteInvestment(id)
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
    const result = await updateInvestment(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Investment updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (investments.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No investment accounts yet. Add one above.</p>
  }

  return (
    <>
      <div className="divide-y">
        {investments.map((inv) => (
          <div
            key={inv.id}
            className={cn('flex items-center justify-between px-6 py-4 gap-4 cursor-pointer hover:bg-muted/50 transition-colors', !inv.is_active && 'opacity-50')}
            onClick={() => setViewItem(inv)}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{inv.name}</span>
                {inv.type && <Badge variant="secondary" className="text-xs">{inv.type}</Badge>}
                {!inv.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
              </div>
              {inv.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.notes}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Link href={`/investments/${inv.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))} onClick={(e) => e.stopPropagation()}>
                View
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings2 className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditItem(inv)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggle(inv.id, inv.is_active)} disabled={loadingId === inv.id}>
                    {inv.is_active ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(inv.id, inv.name)} disabled={loadingId === inv.id}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* View detail modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Investment Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-medium">{viewItem.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Type</span><span className="text-sm">{viewItem.type ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm">{viewItem.notes ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span>{viewItem.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</span></div>
              <div className="flex gap-2 pt-2">
                <Link href={`/investments/${viewItem.id}`} className={cn(buttonVariants({ variant: 'default' }), 'flex-1')}>View Transactions</Link>
                <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Investment</DialogTitle></DialogHeader>
          {editItem && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inv_name">Name</Label>
                <Input id="inv_name" name="name" defaultValue={editItem.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv_type">Type <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="inv_type" name="type" defaultValue={editItem.type ?? ''} placeholder="e.g. Gold, Stocks" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="inv_notes" name="notes" defaultValue={editItem.notes ?? ''} placeholder="optional" />
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
