'use client'

import { createDebt } from '@/app/actions/debts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function DebtForm() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'i_owe' | 'they_owe'>('they_owe')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createDebt(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Debt recorded')
      formRef.current?.reset()
      setType('they_owe')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Debt
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Debt</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setType('they_owe')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${type === 'they_owe' ? 'bg-green-600 text-white' : 'hover:bg-muted'}`}
            >
              They Owe Me
            </button>
            <button
              type="button"
              onClick={() => setType('i_owe')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${type === 'i_owe' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}
            >
              I Owe
            </button>
          </div>
          <input type="hidden" name="type" value={type} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="person_name">
                {type === 'they_owe' ? 'Who owes you?' : 'Who do you owe?'}
              </Label>
              <Input id="person_name" name="person_name" placeholder="e.g. Ali, Kakak" required />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="amount">Amount (RM)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="description" name="description" placeholder="e.g. Lunch, Grab fare" />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="due_date">Due Date <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>

          <Button type="submit" disabled={loading} variant={type === 'i_owe' ? 'destructive' : 'default'}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Record Debt'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
