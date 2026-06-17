# Notes Page — Design

## Goal

Add an independent **Notes** page where the user keeps free-form notes: future plans,
next-month targets, where backup money sits, account numbers, etc. Each note is a
standalone titled entry the user can add/edit/delete.

## Data Model

New migration `supabase/migrations/014_notes.sql`:

```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;
create policy "notes_owner" on notes for all using (auth.uid() = user_id);
create index notes_user_updated_idx on notes (user_id, updated_at desc);
```

Consistent with every other table: `user_id` + RLS (`auth.uid() = user_id`), anon key only.

## Server Actions — `src/app/actions/notes.ts`

`addNote`, `updateNote`, `deleteNote`. Each follows the existing action contract:

1. `createClient()` from `lib/supabase/server`
2. `supabase.auth.getUser()` before any DB op
3. Validate: `title` required (non-empty), `exceedsLength(title, MAX_SHORT_TEXT)` →
   error, `exceedsLength(body, MAX_LONG_TEXT)` → error
4. Mutate; `updateNote` also sets `updated_at = now()`
5. `revalidatePath('/notes')`
6. Return `{ error }` or `{ success: true }`

## Pages / Components — `src/app/notes/`

- `page.tsx` — server component. `getUser()`, fetch notes `order('updated_at', desc)`,
  render `<NoteForm />` + `<NoteList notes={...} />`. Add `loading.tsx` to match other
  routes.
- `NoteForm.tsx` — client. Title `<input>` + body `<textarea>`. Uses the project form
  pattern `onSubmit={e => { e.preventDefault(); handler(new FormData(e.currentTarget)) }}`
  (never `action=`). Muted hint under body: *"Don't store full PINs / passwords / CVV."*
- `NoteList.tsx` — client. Card list (`divide-y`) on mobile and desktop (notes are
  free-text, cards read better than a table). View-detail dialog + inline edit dialog.
  `loadingId` for per-row delete spinner, `editLoading` for modal save spinner — same
  pattern as ExpenseList / BackupHistory.

## Navigation

Add `{ href: '/notes', label: 'Notes' }` as a **top-level** link in
`src/components/AppHeader.tsx` (desktop nav + mobile nav), alongside Dashboard /
Expenses / Debts.

## Security

Notes may hold account numbers. Protection is the same DB boundary as the rest of the
app: per-row RLS, anon key, no service-role key. Plus a UI hint discouraging storage of
full secrets (PIN / password / CVV). No masking, no encryption — masking would give a
false sense of security (data is still plaintext in DB) and adds UI cost for no real
gain. This is documented and intentional.

## Out of Scope (YAGNI)

Tags, pinning, search, markdown rendering, sharing, month-scoping. Just title + body,
newest-edited first.

## Testing / Verification

`npm run build` (type-check) + `npm run lint`. Manual: create / edit / delete a note,
confirm ordering by last edit and RLS isolation.
```
