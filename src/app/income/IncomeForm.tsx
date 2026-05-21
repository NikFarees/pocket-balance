'use client'

import { createIncome } from '@/app/actions/income'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function IncomeForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'income' | 'adjustment'>('income')
  const router = useRouter()

  const today = format(new Date(), 'yyyy-MM-dd')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const rawAmount = parseFloat(formData.get('amount') as string)
    const signedAmount = type === 'adjustment' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
    formData.set('amount', String(signedAmount))
    const result = await createIncome(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(type === 'adjustment' ? 'Adjustment added' : 'Income added')
      setOpen(false)
      setType('income')
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Income / Adjustment
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Entry</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => { setOpen(false); setType('income') }}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${type === 'income' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType('adjustment')}
            className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${type === 'adjustment' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}
          >
            Adjustment (deduct)
          </button>
        </div>
        {type === 'adjustment' && (
          <p className="text-xs text-muted-foreground mb-4">Use this to subtract pre-tracking spending or other deductions from your monthly total.</p>
        )}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RM)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 3500.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income_date">Date</Label>
              <Input
                id="income_date"
                name="income_date"
                type="date"
                defaultValue={today}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              name="source"
              type="text"
              placeholder={type === 'adjustment' ? 'e.g. Pre-app spending' : 'e.g. Salary, Shopee, Gift'}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder={type === 'adjustment' ? 'e.g. First 15 days of month before I started the app' : 'e.g. May salary including bonus'}
              rows={2}
            />
          </div>
          <Button type="submit" disabled={loading} variant={type === 'adjustment' ? 'destructive' : 'default'}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : type === 'adjustment' ? 'Add Adjustment' : 'Add Income'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
