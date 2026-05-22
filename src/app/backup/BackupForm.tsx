'use client'

import { addBackupTransaction } from '@/app/actions/backup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function BackupForm() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await addBackupTransaction(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(type === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded')
      formRef.current?.reset()
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Transaction
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Transaction</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="flex rounded-lg border overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setType('deposit')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${type === 'deposit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${type === 'withdrawal' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}
            >
              Withdrawal
            </button>
          </div>
          <input type="hidden" name="type" value={type} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RM)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date</Label>
              <Input id="transaction_date" name="transaction_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="location" name="location" placeholder="e.g. TNG Go+, Maybank, Cash" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="description" name="description" placeholder="e.g. Monthly savings, Go+ dividends" />
          </div>
          <Button type="submit" disabled={loading} variant={type === 'withdrawal' ? 'destructive' : 'default'}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : `Record ${type === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
