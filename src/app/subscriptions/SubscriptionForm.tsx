'use client'

import { createSubscription } from '@/app/actions/subscriptions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addDays, addMonths, format } from 'date-fns'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'

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

export function SubscriptionForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [startedAt, setStartedAt] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [customDays, setCustomDays] = useState('')
  const [nextRenewal, setNextRenewal] = useState('')
  const [currentCost, setCurrentCost] = useState('0')
  const [renewalCost, setRenewalCost] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  // Auto-calculate next renewal when startedAt or cycle or customDays changes
  useEffect(() => {
    const suggested = calcNextRenewal(startedAt, cycle, customDays)
    if (suggested) setNextRenewal(suggested)
  }, [startedAt, cycle, customDays])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createSubscription(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Subscription added')
      formRef.current?.reset()
      setCycle('monthly')
      setStartedAt(format(new Date(), 'yyyy-MM-dd'))
      setCustomDays('')
      setNextRenewal('')
      setCurrentCost('0')
      setRenewalCost('')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Subscription
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Subscription</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Netflix, GitHub" required />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="provider">Provider <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="provider" name="provider" placeholder="e.g. Netflix Inc." />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="category">Category <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="category" name="category" placeholder="domain / hosting / saas / etc." />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select name="billing_cycle" value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                <SelectTrigger id="billing_cycle">
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
                <Label htmlFor="custom_days">Custom Days</Label>
                <Input
                  id="custom_days"
                  name="custom_days"
                  type="number"
                  min="1"
                  placeholder="e.g. 14"
                  value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="current_cost">Current Cost RM</Label>
              <Input
                id="current_cost"
                name="current_cost"
                inputMode="decimal"
                placeholder="0.00"
                value={currentCost}
                onChange={e => setCurrentCost(e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="renewal_cost">Renewal Cost RM</Label>
              <Input
                id="renewal_cost"
                name="renewal_cost"
                inputMode="decimal"
                placeholder="0.00"
                value={renewalCost}
                onChange={e => setRenewalCost(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="started_at">Started On</Label>
              <Input
                id="started_at"
                name="started_at"
                type="date"
                value={startedAt}
                onChange={e => setStartedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="next_renewal">Next Renewal</Label>
              <Input
                id="next_renewal"
                name="next_renewal"
                type="date"
                value={nextRenewal}
                onChange={e => setNextRenewal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="notes" name="notes" placeholder="Any notes about this subscription" />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Add Subscription'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
