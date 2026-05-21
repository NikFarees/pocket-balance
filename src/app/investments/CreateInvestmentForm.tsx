'use client'

import { createInvestment } from '@/app/actions/investments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

type Category = 'trading' | 'unit_trust' | 'savings'

const CATEGORY_OPTIONS: { value: Category; label: string; description: string }[] = [
  { value: 'trading', label: 'Trading', description: 'Gold, stocks, crypto — you buy and sell' },
  { value: 'unit_trust', label: 'Unit Trust', description: 'ASNB, mutual funds — you save and redeem' },
  { value: 'savings', label: 'Savings', description: 'Tabung Haji, fixed deposit — you deposit and withdraw' },
]

export function CreateInvestmentForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<Category>('trading')
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await createInvestment(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Investment account created')
      formRef.current?.reset()
      setCategory('trading')
      if (result.id) router.push(`/investments/${result.id}`)
      else router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> New Investment Account
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Investment Account</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input id="name" name="name" placeholder="e.g. Maybank MiGA, ASNB, Tabung Haji" required />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    category === opt.value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.description}</div>
                </button>
              ))}
            </div>
            <input type="hidden" name="category" value={category} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" name="notes" placeholder="Any notes about this account" rows={2} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
