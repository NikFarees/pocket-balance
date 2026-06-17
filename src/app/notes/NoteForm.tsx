'use client'

import { addNote } from '@/app/actions/notes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export function NoteForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await addNote(formData)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Note added')
      formRef.current?.reset()
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" /> Add Note
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Add Note</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. Next month target, Backup accounts" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="body" name="body" rows={5} placeholder="Write your plan, target, account info…" />
            <p className="text-xs text-muted-foreground">For your eyes only, but avoid storing full PINs / passwords / CVV.</p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Note'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
