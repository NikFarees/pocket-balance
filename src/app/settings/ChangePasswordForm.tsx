'use client'

import { changePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await changePassword(formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Password changed successfully')
      formRef.current?.reset()
      setOpen(false)
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Change Password
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Change Password</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" name="newPassword" type="password" placeholder="••••••••" required autoComplete="new-password" minLength={6} />
            <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" required autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing…</> : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
