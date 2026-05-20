'use client'

import { createInvestment } from '@/app/actions/investments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function CreateInvestmentForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Account Name</Label>
              <Input id="name" name="name" placeholder="e.g. Maybank Migagold" required />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="type">Type <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="type" name="type" placeholder="e.g. Gold, Unit Trust, e-wallet" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" name="notes" placeholder="Any notes about this investment" rows={2} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
