'use client'

import {
  deleteSubscription,
  renewSubscription,
  toggleSubscriptionActive,
  updateSubscription,
} from '@/app/actions/subscriptions'
import { Paginator } from '@/components/Paginator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { addDays, addMonths, differenceInDays, format, parseISO } from 'date-fns'
import { Loader2, RefreshCw, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type Subscription = {
  id: string
  name: string
  provider: string | null
  category: string | null
  current_cost: number
  renewal_cost: number
  billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  custom_days: number | null
  started_at: string
  next_renewal: string
  notes: string | null
  is_active: boolean
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'

const PAGE_SIZE = 5

function calcNextRenewal(startedAt: string, cycle: BillingCycle, customDays: string): string {
  if (!startedAt) return ''
  try {
    const start = new Date(startedAt)
    let next: Date
    switch (cycle) {
      case 'monthly':
        next = addMonths(start, 1)
        break
      case 'quarterly':
        next = addMonths(start, 3)
        break
      case 'yearly':
        next = addMonths(start, 12)
        break
      case 'custom': {
        const days = parseInt(customDays, 10)
        if (!days || days <= 0) return ''
        next = addDays(start, days)
        break
      }
    }
    return format(next, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

function StatusBadge({ sub }: { sub: Subscription }) {
  if (!sub.is_active) {
    return <Badge variant="outline" className="text-muted-foreground">Canceled</Badge>
  }
  if (sub.current_cost === 0) {
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Free trial</Badge>
  }
  const days = differenceInDays(parseISO(sub.next_renewal), new Date())
  if (days <= 7) {
    return <Badge className="bg-red-500 hover:bg-red-600 text-white">Expires in {days}d</Badge>
  }
  if (days <= 30) {
    return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Renewing in {days}d</Badge>
  }
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">Active</Badge>
}

function cycleName(cycle: string): string {
  switch (cycle) {
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'yearly': return 'Yearly'
    case 'custom': return 'Custom'
    default: return cycle
  }
}

function EditForm({
  sub,
  onSave,
  onCancel,
  onDelete,
  saveLoading,
  deleteLoading,
}: {
  sub: Subscription
  onSave: (formData: FormData) => void
  onCancel: () => void
  onDelete: () => void
  saveLoading: boolean
  deleteLoading: boolean
}) {
  const [cycle, setCycle] = useState<BillingCycle>(sub.billing_cycle)
  const [startedAt, setStartedAt] = useState(sub.started_at ?? '')
  const [customDays, setCustomDays] = useState(sub.custom_days?.toString() ?? '')
  const [nextRenewal, setNextRenewal] = useState(sub.next_renewal ?? '')
  const [currentCost, setCurrentCost] = useState(Number(sub.current_cost).toFixed(2))
  const [renewalCost, setRenewalCost] = useState(Number(sub.renewal_cost).toFixed(2))
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const suggested = calcNextRenewal(startedAt, cycle, customDays)
    if (suggested) setNextRenewal(suggested)
  }, [startedAt, cycle, customDays])

  return (
    <form
      ref={formRef}
      onSubmit={e => { e.preventDefault(); onSave(new FormData(e.currentTarget)) }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_name">Name</Label>
          <Input id="edit_name" name="name" defaultValue={sub.name} required />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_provider">Provider <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="edit_provider" name="provider" defaultValue={sub.provider ?? ''} />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_category">Category <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="edit_category" name="category" defaultValue={sub.category ?? ''} placeholder="domain / hosting / saas / etc." />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_cycle">Billing Cycle</Label>
          <Select name="billing_cycle" value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
            <SelectTrigger id="edit_cycle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {cycle === 'custom' && (
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="edit_custom_days">Custom Days</Label>
            <Input
              id="edit_custom_days"
              name="custom_days"
              type="number"
              min="1"
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_current_cost">Current Cost RM</Label>
          <Input
            id="edit_current_cost"
            name="current_cost"
            inputMode="decimal"
            value={currentCost}
            onChange={e => setCurrentCost(e.target.value)}
          />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_renewal_cost">Renewal Cost RM</Label>
          <Input
            id="edit_renewal_cost"
            name="renewal_cost"
            inputMode="decimal"
            value={renewalCost}
            onChange={e => setRenewalCost(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_started_at">Started On</Label>
          <Input
            id="edit_started_at"
            name="started_at"
            type="date"
            value={startedAt}
            onChange={e => setStartedAt(e.target.value)}
          />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="edit_next_renewal">Next Renewal</Label>
          <Input
            id="edit_next_renewal"
            name="next_renewal"
            type="date"
            value={nextRenewal}
            onChange={e => setNextRenewal(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="edit_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="edit_notes" name="notes" defaultValue={sub.notes ?? ''} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={saveLoading || deleteLoading}
        >
          {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={saveLoading}>
            {saveLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
  const [viewItem, setViewItem] = useState<Subscription | null>(null)
  const [editItem, setEditItem] = useState<Subscription | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(subscriptions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = subscriptions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleRenew(id: string) {
    setLoadingId(id)
    const result = await renewSubscription(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Renewed')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setLoadingId(id)
    const result = await toggleSubscriptionActive(id, isActive)
    if (result.error) toast.error(result.error)
    else {
      toast.success(isActive ? 'Subscription canceled' : 'Subscription reactivated')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    const result = await deleteSubscription(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Deleted')
      setEditItem(null)
      router.refresh()
    }
    setDeleteLoading(false)
  }

  async function handleEdit(formData: FormData) {
    if (!editItem) return
    setEditLoading(true)
    const result = await updateSubscription(editItem.id, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Updated')
      setEditItem(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (subscriptions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet.</p>
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="sm:hidden divide-y">
        {paged.map((s) => (
          <div
            key={s.id}
            className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${!s.is_active ? 'opacity-50' : ''}`}
            onClick={() => setViewItem(s)}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{s.name}</p>
                {s.provider && <p className="text-xs text-muted-foreground mt-0.5">{s.provider}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Renews {format(parseISO(s.next_renewal), 'dd MMM yyyy')} · {cycleName(s.billing_cycle)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-sm">RM {Number(s.renewal_cost).toFixed(2)}</p>
                <div className="mt-0.5">
                  <StatusBadge sub={s} />
                </div>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {s.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => handleRenew(s.id)}
                  disabled={loadingId === s.id}
                >
                  {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3 mr-1" />Renew</>}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-7 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent text-xs"
                >
                  <Settings2 className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditItem(s)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleActive(s.id, s.is_active)} disabled={loadingId === s.id}>
                    {s.is_active ? 'Cancel' : 'Reactivate'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(s.id)} disabled={loadingId === s.id}>Delete</DropdownMenuItem>
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
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Next Renewal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((s) => (
              <TableRow
                key={s.id}
                className={`cursor-pointer ${!s.is_active ? 'opacity-50' : ''}`}
                onClick={() => setViewItem(s)}
              >
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.provider ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{cycleName(s.billing_cycle)}</TableCell>
                <TableCell className="text-right">
                  <p className="font-medium">RM {Number(s.renewal_cost).toFixed(2)}</p>
                  {s.current_cost !== s.renewal_cost && (
                    <p className="text-xs text-muted-foreground">now RM {Number(s.current_cost).toFixed(2)}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(parseISO(s.next_renewal), 'dd MMM yyyy')}
                </TableCell>
                <TableCell>
                  <StatusBadge sub={s} />
                </TableCell>
                <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {s.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleRenew(s.id)}
                        disabled={loadingId === s.id}
                      >
                        {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3 mr-1" />Renew</>}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(ev) => ev.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Settings2 className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditItem(s)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(s.id, s.is_active)} disabled={loadingId === s.id}>
                          {s.is_active ? 'Cancel' : 'Reactivate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(s.id)} disabled={loadingId === s.id}>Delete</DropdownMenuItem>
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

      {/* View detail dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Subscription Detail</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-medium">{viewItem.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Provider</span><span className="text-sm">{viewItem.provider ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Category</span><span className="text-sm">{viewItem.category ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Billing Cycle</span><span className="text-sm">{cycleName(viewItem.billing_cycle)}{viewItem.custom_days ? ` (${viewItem.custom_days} days)` : ''}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Current Cost</span><span className="text-sm font-semibold">RM {Number(viewItem.current_cost).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Renewal Cost</span><span className="text-sm font-semibold">RM {Number(viewItem.renewal_cost).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Started On</span><span className="text-sm">{viewItem.started_at ? format(parseISO(viewItem.started_at), 'dd MMM yyyy') : '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Next Renewal</span><span className="text-sm">{format(parseISO(viewItem.next_renewal), 'dd MMM yyyy')}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Status</span><StatusBadge sub={viewItem} /></div>
              {viewItem.notes && (
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Notes</span><span className="text-sm">{viewItem.notes}</span></div>
              )}
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Subscription</DialogTitle></DialogHeader>
          {editItem && (
            <EditForm
              sub={editItem}
              onSave={handleEdit}
              onCancel={() => setEditItem(null)}
              onDelete={() => handleDelete(editItem.id)}
              saveLoading={editLoading}
              deleteLoading={deleteLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
