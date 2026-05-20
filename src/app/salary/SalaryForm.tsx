'use client'

import { upsertSalary } from '@/app/actions/salary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function SalaryForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const currentMonth = format(new Date(), 'yyyy-MM')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await upsertSalary(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Salary saved')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add / Update Salary</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RM)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 5000.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                name="month"
                type="month"
                defaultValue={currentMonth}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="e.g. Including bonus"
              rows={2}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Salary'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
