# Rich-Text Notes (Tiptap) — Design

## Goal

Replace the plain `<Textarea>` in the Notes add/edit forms with a proper rich-text
editor: headings, bold/italic/underline/strikethrough, bullet + numbered lists, tables,
and blockquote. Stored content renders formatted in the note view dialog and list
preview.

> **Library decision:** originally scoped to Plate; an integration spike showed Plate's
> shadcn registry is all-or-nothing — even the basic kits transitively install the full
> demo editor (25+ `@platejs/*` packages, ~100 component files for AI/math/media/mentions
> we don't use). Switched to **Tiptap v3**, which gives the same feature set with ~5 deps
> and a built-in HTML path.

## Library & Storage

- **Editor:** [Tiptap](https://tiptap.dev) v3 (`@tiptap/react`). Pin all `@tiptap/*` to
  the same version (`3.26.1` at time of writing).
  - Deps: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`,
    `@tiptap/pm` (ProseMirror peer), and `dompurify` (+ `@types/dompurify` only if
    dompurify ships no types — v3 bundles its own; verify).
  - `StarterKit` already includes headings, bold, italic, **underline**, strike, bullet
    list, ordered list, and blockquote. Tables come from `TableKit`
    (`@tiptap/extension-table`), which bundles Table + row/cell/header nodes.
- **Storage:** `editor.getHTML()` produces an HTML string stored in the existing
  `notes.body TEXT` column. No migration. An empty editor serializes to `<p></p>` —
  normalize that to `''` before storing.
- **Sanitize:** `dompurify` sanitizes stored HTML at render time (defense against stored
  XSS even though notes are RLS-scoped to the owner).

## Components

- **`src/app/notes/NoteEditor.tsx`** (client) — Tiptap editor + compact toolbar.
  - `useEditor({ extensions: [StarterKit, TableKit], content: defaultHtml ?? '',
    immediatelyRender: false, onUpdate: ({ editor }) => onChange(editor.getHTML()) })`.
    `immediatelyRender: false` is required under Next App Router to avoid SSR hydration
    mismatch.
  - Props: `defaultHtml?: string`, `onChange: (html: string) => void`.
  - Renders `<NoteToolbar editor={editor} />` + `<EditorContent editor={editor} />`.
    Editing surface (`.tiptap`) styled with app tokens.
- **`src/app/notes/NoteToolbar.tsx`** (client) — buttons driving the editor via
  `editor.chain().focus().toggleX().run()`, active state from `editor.isActive(...)`:
  H1/H2/H3, bold, italic, underline, strikethrough, bullet list, numbered list,
  blockquote, insert table (`insertTable({ rows: 3, cols: 3, withHeaderRow: true })`).
  Styled with existing shadcn `Button` (ghost/sm) + lucide icons.
- **`src/app/notes/NoteForm.tsx`** (modify) — replace `<Textarea name="body">` with
  `<NoteEditor onChange={setBodyHtml}>`. Hold `bodyHtml` in state; render a hidden
  `<input type="hidden" name="body" value={bodyHtml}>` so the existing `addNote` action
  is unchanged (still reads `body` from FormData). Reset editor + state after a
  successful add. Keep the "avoid storing full PINs / passwords / CVV" hint.
- **`src/app/notes/NoteList.tsx`** (modify) — edit dialog swaps `<Textarea>` for
  `<NoteEditor defaultHtml={editNote.body ?? ''} onChange={setEditBody}>` with the same
  hidden-input wiring. View dialog renders the stored HTML via DOMPurify-sanitized
  `dangerouslySetInnerHTML` inside a `.note-content` wrapper. The card preview shows a
  short plain-text snippet derived by stripping tags from the HTML (keeps the existing
  2-line `line-clamp`), not raw markup.

## Server Actions / Validation

- `addNote` / `updateNote` unchanged in shape (still read `body` from FormData).
- HTML inflates length beyond `MAX_LONG_TEXT` (1000). Add `MAX_NOTE_BODY = 20000` to
  `src/lib/validation.ts`; both actions validate `body` against `MAX_NOTE_BODY` instead
  of `MAX_LONG_TEXT`. `title` still uses `MAX_SHORT_TEXT`.

## Styling

Hand-rolled scoped CSS (no `@tailwindcss/typography`; project is Tailwind v4 with no
typography plugin). Add two blocks to `src/app/globals.css`:
- `.tiptap` — the editing surface: padding, min-height, focus ring, and the same
  heading/list/table/blockquote rules as below.
- `.note-content` — the read-only render in the view dialog: `h1/h2/h3`, `ul/ol/li`,
  `table/th/td` (borders), `blockquote`, `strong/em/u/s`, using the app's color tokens.

## Security / CSP

All new code is bundled (Tiptap + dompurify) — no new network origin, so `next.config.ts`
CSP needs no change. Sanitization happens client-side in `NoteList` before
`dangerouslySetInnerHTML`.

## Out of Scope (YAGNI)

Images, file/embed nodes, mentions, slash menu, color/font pickers, code blocks,
collaborative editing, markdown export, link editing.

## Verification

`npm run build` + `npm run lint`. Manual: create a note with each formatting type
(heading, bold, list, table, blockquote), save, reopen edit (content round-trips), view
dialog renders formatted, list preview shows a clean text snippet. Confirm a pasted
`<script>` is stripped on render.
