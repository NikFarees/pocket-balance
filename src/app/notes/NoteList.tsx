'use client'

import { deleteNote, updateNote, type Note } from '@/app/actions/notes'
import { Paginator } from '@/components/Paginator'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format, parseISO } from 'date-fns'
import { Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

const PAGE_SIZE = 8

export function NoteList({ notes }: { notes: Note[] }) {
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = notes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function handleDelete(id: string) {
    setLoadingId(id)
    const result = await deleteNote(id)
    if ('error' in result) toast.error(result.error)
    else {
      toast.success('Note deleted')
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleEdit(formData: FormData) {
    if (!editNote) return
    setEditLoading(true)
    const result = await updateNote(editNote.id, formData)
    if ('error' in result) toast.error(result.error)
    else {
      toast.success('Note updated')
      setEditNote(null)
      router.refresh()
    }
    setEditLoading(false)
  }

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
  }

  return (
    <>
      <div className="divide-y">
        {paged.map((n) => (
          <div
            key={n.id}
            className="px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setViewNote(n)}
          >
            <div className="min-w-0">
              <p className="font-medium text-sm">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-wrap">{n.body}</p>}
              <p className="text-xs text-muted-foreground mt-1">{format(parseISO(n.updated_at), 'dd MMM yyyy')}</p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                  <Settings2 className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditNote(n)}>Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(n.id)} disabled={loadingId === n.id}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <Paginator page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* View modal */}
      <Dialog open={!!viewNote} onOpenChange={(open) => { if (!open) setViewNote(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewNote?.title}</DialogTitle></DialogHeader>
          {viewNote && (
            <div className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{viewNote.body || <span className="text-muted-foreground">No details.</span>}</p>
              <p className="text-xs text-muted-foreground">Last updated {format(parseISO(viewNote.updated_at), 'dd MMM yyyy')}</p>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewNote(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editNote} onOpenChange={(open) => { if (!open) setEditNote(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Note</DialogTitle></DialogHeader>
          {editNote && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nt_title">Title</Label>
                <Input id="nt_title" name="title" defaultValue={editNote.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nt_body">Note <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea id="nt_body" name="body" rows={5} defaultValue={editNote.body ?? ''} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditNote(null)}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
