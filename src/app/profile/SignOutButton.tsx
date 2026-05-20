'use client'

import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'
import { useState } from 'react'

export function SignOutButton() {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await logout()
  }

  return (
    <Button
      type="button"
      variant="destructive"
      className="w-full gap-2"
      disabled={loading}
      onClick={handleSignOut}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
