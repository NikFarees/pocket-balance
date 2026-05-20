'use client'

import { setDailyTarget } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function TargetForm() {
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await setDailyTarget(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Daily target saved')
      formRef.current?.reset()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Daily Target</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily_amount">Daily Amount (RM)</Label>
              <Input
                id="daily_amount"
                name="daily_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                name="effective_from"
                type="date"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The most recent target on or before today is used as your current limit.
          </p>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Target'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
