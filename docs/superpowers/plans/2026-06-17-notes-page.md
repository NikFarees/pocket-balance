# Notes Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent Notes page where the user keeps free-form titled notes (future plans, monthly targets, backup account info).

**Architecture:** New `notes` table (RLS, anon key) → Server Actions in `src/app/actions/notes.ts` (add/update/delete + fetch) → `src/app/notes/` page reusing the existing Form + List dual-view component pattern → top-level nav link in `AppHeader`.

**Tech Stack:** Next.js (App Router, Server Components + Server Actions), Supabase (`@supabase/ssr`, anon key + RLS), Tailwind, shadcn/ui, sonner, date-fns, lucide-react.

## Global Constraints

- Currency display prefix `RM` (not relevant here — notes have no amounts).
- Every table: `user_id UUID REFERENCES auth.users` + RLS `FOR ALL USING (auth.uid() = user_id)`. Anon key only, no service-role key.
- Server Actions contract: `createClient()` from `@/lib/supabase/server` → `supabase.auth.getUser()` before any DB op → validate (text max-length via `exceedsLength` / `MAX_SHORT_TEXT=200` / `MAX_LONG_TEXT=1000`) → mutate → `revalidatePath('/notes')` → return `{ error: string }` or `{ success: true }`.
- Forms use `onSubmit={e => { e.preventDefault(); handler(new FormData(e.currentTarget)) }}` — never `action={handler}`.
- No test framework exists. Verification per task = `npm run build` (type-check) + `npm run lint`. Both must pass clean.
- Migration SQL: uppercase keywords, `gen_random_uuid()`, `ON DELETE CASCADE`, matching `supabase/migrations/010_subscriptions.sql` style.

---

### Task 1: DB migration + Server Actions

**Files:**
- Create: `supabase/migrations/014_notes.sql`
- Create: `src/app/actions/notes.ts`

**Interfaces:**
- Produces:
  - `type Note = { id: string; title: string; body: string | null; created_at: string; updated_at: string }`
  - `getNotesData(): Promise<{ notes: Note[] } | null>`
  - `addNote(formData: FormData): Promise<{ error: string } | { success: true }>`
  - `updateNote(id: string, formData: FormData): Promise<{ error: string } | { success: true }>`
  - `deleteNote(id: string): Promise<{ error: string } | { success: true }>`
  - FormData fields consumed: `title` (required), `body` (optional)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/014_notes.sql`:

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes"
  ON notes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX notes_user_updated_idx ON notes (user_id, updated_at DESC);
```

- [ ] **Step 2: Write the actions file**

Create `src/app/actions/notes.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { exceedsLength, MAX_SHORT_TEXT, MAX_LONG_TEXT } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export type Note = {
  id: string
  title: string
  body: string | null
  created_at: string
  updated_at: string
}

export async function getNotesData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return { notes: (data ?? []) as Note[] }
}

export async function addNote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string).trim()
  const body = (formData.get('body') as string).trim() || null

  if (!title) return { error: 'Title is required' }
  if (exceedsLength(title, MAX_SHORT_TEXT)) return { error: 'Title is too long' }
  if (exceedsLength(body, MAX_LONG_TEXT)) return { error: 'Note is too long' }

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title,
    body,
  })

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function updateNote(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string).trim()
  const body = (formData.get('body') as string).trim() || null

  if (!title) return { error: 'Title is required' }
  if (exceedsLength(title, MAX_SHORT_TEXT)) return { error: 'Title is too long' }
  if (exceedsLength(body, MAX_LONG_TEXT)) return { error: 'Note is too long' }

  const { error } = await supabase
    .from('notes')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function deleteNote(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: both pass, no type errors referencing `notes.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/014_notes.sql src/app/actions/notes.ts
git commit -m "feat: notes table migration and server actions"
```

---

### Task 2: NoteForm component

**Files:**
- Create: `src/app/notes/NoteForm.tsx`

**Interfaces:**
- Consumes: `addNote` from `@/app/actions/notes`
- Produces: `<NoteForm />` (no props) — collapsible add form, same UX as `BackupForm`

- [ ] **Step 1: Write the component**

Create `src/app/notes/NoteForm.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: both pass. (Page route `/notes` not built yet until Task 4 — component compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add src/app/notes/NoteForm.tsx
git commit -m "feat: note add form"
```

---

### Task 3: NoteList component

**Files:**
- Create: `src/app/notes/NoteList.tsx`

**Interfaces:**
- Consumes: `Note`, `deleteNote`, `updateNote` from `@/app/actions/notes`
- Produces: `<NoteList notes={Note[]} />`

- [ ] **Step 1: Write the component**

Create `src/app/notes/NoteList.tsx`. Card list for both mobile and desktop (notes are free-text). View dialog + edit dialog, `loadingId` delete spinner, `editLoading` save spinner, `Paginator` like `BackupHistory`:

```tsx
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
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/notes/NoteList.tsx
git commit -m "feat: note list with view/edit/delete"
```

---

### Task 4: Page, loading, and nav wiring

**Files:**
- Create: `src/app/notes/page.tsx`
- Create: `src/app/notes/loading.tsx`
- Modify: `src/components/AppHeader.tsx:18-22` (add to `standaloneLinks`)

**Interfaces:**
- Consumes: `getNotesData` from `@/app/actions/notes`, `<NoteForm />`, `<NoteList />`

- [ ] **Step 1: Write the page**

Create `src/app/notes/page.tsx`:

```tsx
import { getNotesData } from '@/app/actions/notes'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoteForm } from './NoteForm'
import { NoteList } from './NoteList'

export default async function NotesPage() {
  const data = await getNotesData()
  if (!data) return null

  const { notes } = data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Notes</h2>

        <NoteForm />

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Your Notes</span>
              <span className="text-sm font-normal text-muted-foreground">{notes.length} notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <NoteList notes={notes} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Write the loading state**

Create `src/app/notes/loading.tsx`:

```tsx
import { PageLoader } from '@/components/PageLoader'
export default function Loading() {
  return <PageLoader title="Notes" statCount={0} showTable />
}
```

- [ ] **Step 3: Add nav link**

In `src/components/AppHeader.tsx`, modify `standaloneLinks`:

```tsx
const standaloneLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/debts', label: 'Debts' },
  { href: '/notes', label: 'Notes' },
]
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: both pass; `/notes` route appears in build output.

- [ ] **Step 5: Commit**

```bash
git add src/app/notes/page.tsx src/app/notes/loading.tsx src/components/AppHeader.tsx
git commit -m "feat: notes page and nav link"
```

---

## Notes for executor

- `PageLoader({ title, statCount=4, showTable=true })` always renders stat cards; Notes has none, so pass `statCount={0}`.
- If `npm run build` 404s persist after creating routes, `rm -rf .next` and rebuild.
- Apply migration `014_notes.sql` to Supabase before manual testing (via Supabase MCP `apply_migration` or dashboard SQL editor).
