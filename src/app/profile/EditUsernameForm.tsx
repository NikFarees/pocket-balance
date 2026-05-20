'use client'

import { updateUsername } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function EditUsernameForm({ currentUsername }: { currentUsername: string | null }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const result = await updateUsername(new FormData(e.currentTarget))
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Username updated')
      setEditing(false)
    }
    setLoading(false)
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
        <Pencil className="size-3.5" />
        {currentUsername ? 'Edit username' : 'Set username'}
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        name="username"
        defaultValue={currentUsername ?? ''}
        placeholder="Enter username"
        required
        className="h-9 w-48"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditing(false)}>
        <X className="size-4" />
      </Button>
    </form>
  )
}
