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

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 py-3">
        <Input
          name="username"
          defaultValue={currentUsername ?? ''}
          placeholder="Enter username"
          required
          className="h-8 text-sm flex-1"
          autoFocus
        />
        <Button type="submit" size="sm" className="h-8 text-xs px-3" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setEditing(false)}
        >
          <X className="size-3.5" />
        </Button>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm">
        {currentUsername ?? <span className="text-muted-foreground italic">Not set</span>}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
        aria-label="Edit username"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  )
}
