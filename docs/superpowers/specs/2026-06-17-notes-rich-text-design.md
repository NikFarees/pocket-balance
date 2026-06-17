# Rich-Text Notes (Plate) — Design

## Goal

Replace the plain `<Textarea>` in the Notes add/edit forms with a proper rich-text
editor: headings, bold/italic/underline/strikethrough, bullet + numbered lists, tables,
and blockquote. Stored content renders formatted in the note view dialog and list
preview.

## Library & Storage

- **Editor:** [Plate](https://platejs.org) (Slate-based, shadcn-aligned). UI components
  pulled via the Plate shadcn registry (`npx shadcn add` from platejs.org) into
  `src/components/ui/`. Plate's API churns across majors — **the implementation plan
  must pin exact package versions and confirm the current API (plugin names,
  serialize/deserialize entry points) against installed docs before writing code.**
- **Storage:** editor serializes to an **HTML string** stored in the existing
  `notes.body TEXT` column. No migration.
- **Sanitize:** `dompurify` sanitizes stored HTML at render time (defense against stored
  XSS even though notes are RLS-scoped to the owner).

## Components

- **`src/app/notes/NoteEditor.tsx`** (client) — Plate editor + compact toolbar.
  - Plugins: basic marks (bold, italic, underline, strikethrough), headings (H1–H3),
    bullet list, numbered list, table, blockquote.
  - Props: `defaultHtml?: string` (for edit mode), and a way to read current value as
    HTML on submit. Expose value via a ref or `onChange` lifting HTML to parent state.
  - Toolbar buttons styled with existing shadcn `Button`/tokens so it matches PennyWise.
- **`src/app/notes/NoteForm.tsx`** (modify) — replace `<Textarea name="body">` with
  `<NoteEditor>`. On submit, take the editor's serialized HTML, set it on a hidden
  `<input name="body">` (or build `FormData` manually) so the existing `addNote` action
  is unchanged. Keep the "avoid storing full PINs / passwords / CVV" hint.
- **`src/app/notes/NoteList.tsx`** (modify) — edit dialog swaps `<Textarea>` for
  `<NoteEditor defaultHtml={editNote.body}>`. View dialog and the card preview render the
  stored HTML via DOMPurify-sanitized `dangerouslySetInnerHTML` inside a `.note-content`
  wrapper. Preview stays line-clamped; strip to a short rendered snippet.

## Server Actions / Validation

- `addNote` / `updateNote` unchanged in shape (still read `body` from FormData).
- HTML inflates length beyond `MAX_LONG_TEXT` (1000). Add `MAX_NOTE_BODY = 20000` to
  `src/lib/validation.ts`; both actions validate `body` against `MAX_NOTE_BODY` instead
  of `MAX_LONG_TEXT`. `title` still uses `MAX_SHORT_TEXT`.

## Styling

Hand-rolled scoped CSS for rendered content (no `@tailwindcss/typography` dependency —
project uses Tailwind v4 and ships no typography plugin). Add a `.note-content` block to
`src/app/globals.css` styling `h1/h2/h3`, `ul/ol/li`, `table/th/td`, `blockquote`,
`strong/em/u/s` with the app's existing color tokens. The Plate editing surface uses
Plate's registry component styles (also token-driven).

## Security / CSP

All new code is bundled (Plate + dompurify) — no new network origin, so `next.config.ts`
CSP needs no change. Sanitization happens client-side in `NoteList` before
`dangerouslySetInnerHTML`.

## Out of Scope (YAGNI)

Images, file/embed nodes, mentions, slash menu beyond Plate defaults, color/font pickers,
code blocks, collaborative editing, markdown export.

## Verification

`npm run build` + `npm run lint`. Manual: create a note with each formatting type
(heading, bold, list, table, blockquote), save, reopen edit (content round-trips), view
dialog renders formatted, list preview shows a clean snippet. Confirm a pasted
`<script>` is stripped on render.
