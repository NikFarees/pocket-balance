'use client'

import { deleteNote, updateNote, type Note } from '@/app/actions/notes'
import { Paginator } from '@/components/Paginator'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DOMPurify from 'dompurify'
import { format, parseISO } from 'date-fns'
import { Loader2, Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { NoteEditor } from './NoteEditor'

const PAGE_SIZE = 8

/** Pure-JS tag strip for list previews (runs during SSR — no DOM/DOMPurify). */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function NoteList({ notes }: { notes: Note[] }) {
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [editBody, setEditBody] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [page, setPage] = useState(1)
  const editFormRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = notes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function openEdit(n: Note) {
    setEditNote(n)
    setEditBody(n.body ?? '')
  }

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
              {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{stripHtml(n.body)}</p>}
              <p className="text-xs text-muted-foreground mt-1">{format(parseISO(n.updated_at), 'dd MMM yyyy')}</p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                  <Settings2 className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(n)}>Edit</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{viewNote?.title}</DialogTitle></DialogHeader>
          {viewNote && (
            <div className="space-y-3">
              {viewNote.body
                ? <div className="note-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewNote.body) }} />
                : <p className="text-sm text-muted-foreground">No details.</p>}
              <p className="text-xs text-muted-foreground">Last updated {format(parseISO(viewNote.updated_at), 'dd MMM yyyy')}</p>
              <Button variant="outline" className="w-full mt-2" onClick={() => setViewNote(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editNote} onOpenChange={(open) => { if (!open) setEditNote(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit Note</DialogTitle></DialogHeader>
          {editNote && (
            <form ref={editFormRef} onSubmit={e => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nt_title">Title</Label>
                <Input id="nt_title" name="title" defaultValue={editNote.title} required />
              </div>
              <div className="space-y-2">
                <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
                <NoteEditor key={editNote.id} defaultHtml={editNote.body ?? ''} onChange={setEditBody} />
                <input type="hidden" name="body" value={editBody} />
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
