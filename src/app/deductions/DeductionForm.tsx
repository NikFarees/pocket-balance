'use client'

import { createDeduction, updateDeduction } from '@/app/actions/deductions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Deduction = {
  id: string
  name: string
  expected_amount: number
  due_date: number | null
  category: string | null
}

type Props = {
  editing?: Deduction
  onCancel?: () => void
}

export function DeductionForm({ editing, onCancel }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = editing
      ? await updateDeduction(editing.id, formData)
      : await createDeduction(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editing ? 'Liability updated' : 'Liability added')
      setOpen(false)
      router.refresh()
      onCancel?.()
    }
    setLoading(false)
  }

  // In edit mode, always show inline (controlled by parent)
  if (!editing && !open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Liability
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>{editing ? 'Edit Liability' : 'Add Liability'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => { setOpen(false); onCancel?.() }}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Car Payment"
                defaultValue={editing?.name}
                required
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="expected_amount">Amount (RM)</Label>
              <Input
                id="expected_amount"
                name="expected_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 500.00"
                defaultValue={editing?.expected_amount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">
                Due Date <span className="text-muted-foreground">(day of month, optional)</span>
              </Label>
              <Input
                id="due_date"
                name="due_date"
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15"
                defaultValue={editing?.due_date ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g. Transport, Insurance"
                defaultValue={editing?.category ?? ''}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editing ? 'Update' : 'Add Liability'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
