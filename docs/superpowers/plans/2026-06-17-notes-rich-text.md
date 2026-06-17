# Rich-Text Notes (Tiptap) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain note `<Textarea>` with a Tiptap v3 rich-text editor (headings, bold/italic/underline/strike, lists, tables, blockquote), storing sanitized HTML in `notes.body`.

**Architecture:** Tiptap `useEditor` (StarterKit + TableKit) in a client `NoteEditor` + `NoteToolbar`. Editor serializes to HTML via `editor.getHTML()`; forms carry it through a hidden `body` input so existing `addNote`/`updateNote` stay unchanged. The view dialog renders DOMPurify-sanitized HTML; the list preview shows a stripped-to-text snippet. Scoped CSS in `globals.css` styles both the editing surface (`.tiptap`) and the rendered output (`.note-content`).

**Tech Stack:** Next.js App Router (React 19), Tiptap v3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/pm`), `dompurify`, Tailwind v4, shadcn/ui, lucide-react, sonner.

## Global Constraints

- Pin all `@tiptap/*` packages to the SAME version: `3.26.1`. `dompurify` `3.4.10`.
- No DB migration — `notes.body TEXT` stores the HTML string. Empty editor (`<p></p>`) normalizes to `''` before storing.
- `useEditor` MUST pass `immediatelyRender: false` (Next App Router SSR — otherwise hydration mismatch).
- DOMPurify runs client-side only. NEVER call `DOMPurify.sanitize` in code that executes during SSR. The view-dialog render is safe (only renders after a client click, when `viewNote` is set). The list preview MUST use a pure-JS tag strip, not DOMPurify.
- Forms keep the project pattern: `onSubmit={e => { e.preventDefault(); handler(new FormData(e.currentTarget)) }}` — never `action=`. Rich content reaches the action via a hidden `<input type="hidden" name="body">`.
- No test framework. Per-task verification = `npm run build` (type-check) + `npm run lint`. Build must pass clean; ignore the known pre-existing lint errors in `subscriptions/*` and `ThemeToggle.tsx`, but introduce ZERO new lint issues.
- Currency/`RM` not relevant here.

---

### Task 1: Dependencies + body length constant

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/lib/validation.ts`
- Modify: `src/app/actions/notes.ts`

**Interfaces:**
- Produces: `MAX_NOTE_BODY = 20000` (number) exported from `@/lib/validation`.

- [ ] **Step 1: Install dependencies**

Run from repo root:

```bash
npm install @tiptap/react@3.26.1 @tiptap/starter-kit@3.26.1 @tiptap/extension-table@3.26.1 @tiptap/pm@3.26.1 dompurify@3.4.10
```

Then confirm no stray Plate packages remain in `package.json` (there should be none):

```bash
grep -i "platejs\|@plate" package.json || echo "clean - no plate deps"
```

Expected: `clean - no plate deps`.

- [ ] **Step 2: Add the constant**

Edit `src/lib/validation.ts` — add `MAX_NOTE_BODY` after `MAX_LONG_TEXT`:

```ts
export const MAX_SHORT_TEXT = 200
export const MAX_LONG_TEXT = 1000
export const MAX_NOTE_BODY = 20000
```

- [ ] **Step 3: Use it in the notes actions**

In `src/app/actions/notes.ts`:

Change the import line:
```ts
import { exceedsLength, MAX_SHORT_TEXT, MAX_LONG_TEXT } from '@/lib/validation'
```
to:
```ts
import { exceedsLength, MAX_SHORT_TEXT, MAX_NOTE_BODY } from '@/lib/validation'
```

Then in BOTH `addNote` and `updateNote`, change the body check:
```ts
  if (exceedsLength(body, MAX_LONG_TEXT)) return { error: 'Note is too long' }
```
to:
```ts
  if (exceedsLength(body, MAX_NOTE_BODY)) return { error: 'Note is too long' }
```

(`MAX_LONG_TEXT` is no longer referenced in this file — that's why it leaves the import.)

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build passes clean; no new lint issues; no "MAX_LONG_TEXT is not defined" error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/validation.ts src/app/actions/notes.ts
git commit -m "feat: add tiptap deps and note body length cap"
```

---

### Task 2: NoteEditor + NoteToolbar + scoped styles

**Files:**
- Create: `src/app/notes/NoteEditor.tsx`
- Create: `src/app/notes/NoteToolbar.tsx`
- Modify: `src/app/globals.css` (append a styles block at end of file)

**Interfaces:**
- Produces:
  - `NoteEditor` — `function NoteEditor({ defaultHtml?: string; onChange: (html: string) => void }): JSX.Element`
  - `NoteToolbar` — `function NoteToolbar({ editor }: { editor: Editor }): JSX.Element` where `Editor` is `import('@tiptap/react').Editor`

- [ ] **Step 1: Write NoteToolbar**

Create `src/app/notes/NoteToolbar.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered,
  Quote, Strikethrough, Table as TableIcon, Underline as UnderlineIcon,
} from 'lucide-react'

export function NoteToolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'),
    }),
  })

  const cls = (active: boolean) => cn('h-8 w-8 p-0', active && 'bg-muted text-foreground')

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <Button type="button" variant="ghost" size="sm" className={cls(s.h1)} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Heading 1"><Heading1 className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.h2)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2"><Heading2 className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.h3)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3"><Heading3 className="size-4" /></Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" className={cls(s.bold)} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.italic)} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.underline)} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline"><UnderlineIcon className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.strike)} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Strikethrough"><Strikethrough className="size-4" /></Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" className={cls(s.bullet)} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.ordered)} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list"><ListOrdered className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.quote)} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote"><Quote className="size-4" /></Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insert table"><TableIcon className="size-4" /></Button>
    </div>
  )
}
```

- [ ] **Step 2: Write NoteEditor**

Create `src/app/notes/NoteEditor.tsx`:

```tsx
'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { NoteToolbar } from './NoteToolbar'

export function NoteEditor({
  defaultHtml = '',
  onChange,
}: {
  defaultHtml?: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit, TableKit],
    content: defaultHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50">
      <NoteToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 3: Append scoped styles**

Append to the END of `src/app/globals.css`:

```css
/* Tiptap note editor + rendered note content */
.tiptap {
  padding: 0.75rem;
  min-height: 8rem;
  outline: none;
}
.tiptap :first-child { margin-top: 0; }
.tiptap, .note-content {
  font-size: 0.875rem;
  line-height: 1.5;
}
.tiptap p, .note-content p { margin: 0.25rem 0; }
.tiptap h1, .note-content h1 { font-size: 1.5rem; font-weight: 700; margin: 0.6rem 0 0.3rem; }
.tiptap h2, .note-content h2 { font-size: 1.25rem; font-weight: 600; margin: 0.6rem 0 0.3rem; }
.tiptap h3, .note-content h3 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0 0.3rem; }
.tiptap ul, .note-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.4rem 0; }
.tiptap ol, .note-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
.tiptap blockquote, .note-content blockquote {
  border-left: 3px solid var(--border);
  padding-left: 0.75rem;
  color: var(--muted-foreground);
  margin: 0.5rem 0;
}
.tiptap table, .note-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
  table-layout: fixed;
}
.tiptap td, .tiptap th, .note-content td, .note-content th {
  border: 1px solid var(--border);
  padding: 0.3rem 0.5rem;
  text-align: left;
  vertical-align: top;
}
.tiptap th, .note-content th { background: var(--muted); font-weight: 600; }
.tiptap a, .note-content a { color: var(--primary); text-decoration: underline; }
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build passes clean (NoteEditor/NoteToolbar compile; not yet imported by a route — that's fine). Zero new lint issues.

- [ ] **Step 5: Commit**

```bash
git add src/app/notes/NoteEditor.tsx src/app/notes/NoteToolbar.tsx src/app/globals.css
git commit -m "feat: tiptap note editor, toolbar, and content styles"
```

---

### Task 3: Wire NoteEditor into the add form

**Files:**
- Modify: `src/app/notes/NoteForm.tsx`

**Interfaces:**
- Consumes: `NoteEditor` from `./NoteEditor`

- [ ] **Step 1: Replace the textarea with the editor**

Rewrite `src/app/notes/NoteForm.tsx` to this exact content:

```tsx
'use client'

import { addNote } from '@/app/actions/notes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { NoteEditor } from './NoteEditor'

export function NoteForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bodyHtml, setBodyHtml] = useState('')
  const [editorKey, setEditorKey] = useState(0)
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
      setBodyHtml('')
      setEditorKey(k => k + 1)
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
            <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
            <NoteEditor key={editorKey} onChange={setBodyHtml} />
            <input type="hidden" name="body" value={bodyHtml} />
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
Expected: build passes clean; `/notes` route still builds. Zero new lint issues. (`Textarea` import is intentionally gone.)

- [ ] **Step 3: Commit**

```bash
git add src/app/notes/NoteForm.tsx
git commit -m "feat: use rich-text editor in note add form"
```

---

### Task 4: Wire editor + sanitized render into NoteList

**Files:**
- Modify: `src/app/notes/NoteList.tsx`

**Interfaces:**
- Consumes: `NoteEditor` from `./NoteEditor`, `DOMPurify` from `dompurify`

- [ ] **Step 1: Rewrite NoteList**

Rewrite `src/app/notes/NoteList.tsx` to this exact content (changes: editor in edit dialog with hidden `body` input + `editBody` state seeded on open; sanitized HTML in view dialog; `stripHtml` text snippet in preview):

```tsx
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
        <DialogContent>
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
        <DialogContent>
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
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build passes clean; `/notes` route builds. Zero new lint issues. (`Textarea` import is intentionally gone.)

- [ ] **Step 3: Commit**

```bash
git add src/app/notes/NoteList.tsx
git commit -m "feat: rich-text edit + sanitized render in note list"
```

---

## Notes for executor

- Tiptap v3: `StarterKit` already bundles Underline (and bold/italic/strike/headings/lists/blockquote). `TableKit` from `@tiptap/extension-table` bundles table + row/cell/header. Do NOT add separate underline/table-row/cell/header packages.
- If `useEditorState`'s import or `Editor` type errors, both come from `@tiptap/react` in v3.
- `dompurify` v3 ships its own TypeScript types — do NOT install `@types/dompurify` (it would conflict).
- Manual smoke test after Task 4 (`npm run dev`): add a note using each format (H1/H2/H3, bold, underline, bullet + numbered list, blockquote, a 3×3 table), save, confirm the list preview shows clean text, the view dialog renders formatted, and editing the note round-trips the content.
