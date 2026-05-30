# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PocketBalance is a personal daily financial tracker. Users log income (salary, side income, gifts, etc.), set up recurring deductions (bills, subscriptions), record daily expenses, track debts, manage investments, and maintain a backup/emergency fund — with a running daily balance and carry-forward overspend logic.

**Currency**: All amounts displayed as Malaysian Ringgit (`RM`).

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (also surfaces TypeScript errors — no separate type-check script)
npm run lint     # ESLint
```

**Dev server cache**: if routes return 404 unexpectedly after file changes, kill the server, run `rm -rf .next`, then restart.

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=   # used for auth email redirect (e.g. https://yourdomain.com)
GOOGLE_AI_STUDIO_API_KEY=  # server-only — powers the AI assistant (get a free key at aistudio.google.com). NEVER prefix with NEXT_PUBLIC_
GOOGLE_AI_MODEL=           # optional; defaults to gemini-2.0-flash
```

## Architecture

### Auth Flow

Auth is handled by `src/proxy.ts`. Despite not being named `middleware.ts`, Turbopack treats it as middleware because it exports a `config.matcher`. It uses `@supabase/ssr` to refresh sessions via cookies and redirects unauthenticated users to `/login`. Public (unauthenticated) routes are `/login`, `/signup`, `/forgot-password`, and anything under `/auth/` — all others require a session. Authenticated users hitting public routes are redirected to `/`.

The email confirmation callback is at `src/app/auth/callback/route.ts`.

Supabase clients:
- `src/lib/supabase/server.ts` — for Server Components and Server Actions (cookie-based)
- `src/lib/supabase/client.ts` — for Client Components (`createBrowserClient`)

### Database Schema

All tables use `user_id UUID REFERENCES auth.users` with RLS (`FOR ALL USING (auth.uid() = user_id)`). Migrations live in `supabase/migrations/`.

| Table | Purpose |
|---|---|
| `incomes` | Multi-row income log. `amount` stores **net take-home** (can be negative for adjustments). Free-text `source`, `income_date` DATE. Optional statutory columns: `gross_amount`, `epf_employee/employer`, `socso_employee/employer`, `eis_employee/employer`, `tax_pcb` (all nullable NUMERIC). `other_deductions JSONB` stores `[{label, amount}]` for dynamic deductions (unpaid leave etc.). |
| `deductions` | Recurring deduction templates (car, insurance, etc.) with `is_active` flag |
| `deduction_payments` | Per-month payment records against a deduction; `month` = first day of month |
| `expenses` | Daily expense entries with `expense_date` DATE and `created_at` TIMESTAMPTZ |
| `daily_targets` | Daily spending limit with `effective_from` DATE; most recent on/before today is active |
| `investments` | Investment account templates. `category` TEXT enum: `'trading'` (gold/stocks — buy/sell), `'unit_trust'` (ASNB — save/redeem/dividend), `'savings'` (Tabung Haji — deposit/withdraw/dividend). `is_active` flag. |
| `investment_transactions` | Transactions per investment. `type`: `'buy'` \| `'sell'` \| `'dividend'`. `'dividend'` always has null `quantity`/`price_per_unit`. Optional `quantity` and `price_per_unit` used only for `trading` category. |
| `backup_fund_transactions` | Deposit/withdrawal to emergency fund |
| `debts` | Debts with `type` ('i_owe'/'they_owe'), `is_settled`, and `settled_date` |
| `profiles` | User profile; `username` (nullable); upserted on conflict of `user_id` |

**Signup gap**: the signup form has a username field but the `signup` action does not persist it — would need `options.data: { username }` in `supabase.auth.signUp` plus a `profiles` upsert.

### Key Business Logic

**Daily budget with carry-forward** (`src/app/actions/dashboard.ts`):
1. Monthly budget = sum of `incomes.amount` for the month − total active deductions
2. For each day from month start to yesterday: `carryForward = max(0, carryForward + spent − dailyTarget)`
3. Today's effective spend = `carryForward + todaySpend` vs `dailyTarget`

**Income / Adjustment toggle**: same `incomes` table; adjustment entries have a negative `amount` and no `gross_amount`. The Income form applies `−Math.abs(amount)` before submit when type is `adjustment`.

**Statutory contributions** (`src/lib/statutory.ts`): When a salary entry has a `gross_amount`, the form auto-calculates EPF (11%/13%≤5k or 12%), SOCSO (0.5%/1.75%), EIS (0.2%/0.2%) and lets the user enter PCB manually. `calcNet(gross, contributions, otherDeductionsTotal?)` computes net take-home, which is what gets stored in `amount`. Dashboard budget is unaffected — it always sums `amount` (the net).

**Deduction tracking**: `deductions` are templates; `deduction_payments` records which ones are paid each month. No cross-month carry-over.

### Route Structure

```
src/app/
  (auth)/               # Unauthenticated routes — redirects to / if logged in
    login/
    signup/
    forgot-password/
    reset-password/
  auth/callback/        # Supabase email confirmation handler
  page.tsx              # Dashboard — summary cards + monthly liabilities table
  expenses/             # Daily expenses: QuickAddForm + ExpenseList / MonthlyExpenseList
  income/               # IncomeForm + IncomeHistory (multi-source, Income/Adjustment toggle, statutory contributions)
  deductions/           # DeductionForm + DeductionList + payment history by month
  debts/                # DebtForm + DebtList (tabbed: they owe / I owe)
  investments/          # CreateInvestmentForm + InvestmentList
  investments/[id]/     # Single investment: TransactionForm + TransactionList
  backup/               # BackupForm + BackupHistory
  settings/             # TargetForm + TargetHistory + ChangePasswordForm
  profile/              # EditUsernameForm + ChangePasswordForm + SignOutButton
```

### Server Actions

All mutations go through Server Actions in `src/app/actions/`. No API routes. Each action:
1. Calls `createClient()` from `lib/supabase/server`
2. Verifies `supabase.auth.getUser()` before any DB operation
3. Returns `{ error: string }` on failure or `{ success: true }` (sometimes with data) on success

### AI Assistant

A floating Claude-powered assistant (voice + text) is mounted globally via `<AssistantWidget />` in `src/app/layout.tsx` (rendered only when a user session exists). It lets users log entries and ask questions in natural language.

- **Route**: `POST /api/assistant` (`src/app/api/assistant/route.ts`) — the only API route in the app. Authenticates via `getUser()`, then runs a Claude tool-use loop. Model is `process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'`. API key stays server-side.
- **Tools** (`src/lib/ai/tools.ts`): split into **read** tools (`get_today_status`, `get_month_summary`, `get_backup_balance`, `get_debts_summary`) and **write** tools (`add_expense`, `add_income`, `add_debt`, `add_backup_transaction`, `add_investment_transaction`). `WRITE_TOOL_NAMES`/`READ_TOOL_NAMES` drive the route's behaviour.
- **Read tools execute server-side** in `src/lib/ai/queries.ts` (reusing existing actions like `getExpensesPageData`/`getBackupData` and dashboard math), feeding results back to Claude so it can answer.
- **Write tools are propose-then-confirm**: Claude never writes to the DB. When it calls a write tool, the route returns `{ type: 'proposal', action, params }`; the client shows a confirm card and, on Confirm, `executeProposal` (`src/components/assistant/executeProposal.ts`) builds `FormData` and calls the **existing** server action (`addExpense`, `createIncome`, etc.) — so all validation, RLS, and `revalidatePath` are reused. Read-only Q&A returns `{ type: 'message', text }`.
- **Voice**: `useSpeechRecognition` (browser Web Speech API, no deps) fills the input; the mic is hidden where unsupported (e.g. Firefox).
- Prompt caching (`cache_control`) is applied to the static system prompt + tool definitions.

### Component Patterns

**List components** (ExpenseList, DebtList, IncomeHistory, etc.) follow a consistent dual-view pattern:
- Mobile (`sm:hidden`): card list with `divide-y`, inline action buttons
- Desktop (`hidden sm:block`): `overflow-x-auto` table
- View detail dialog + edit dialog with inline form
- `loadingId` state for per-row delete/action spinners; `editLoading` for modal save spinner

**Forms** always use `onSubmit={e => { e.preventDefault(); handler(new FormData(e.currentTarget)) }}` — **never** `action={handler}`. Using `action=` wraps the call in a React transition which prevents loading spinners from showing.

**Editable number inputs in forms**: use `type="text"` + `inputMode="decimal"` with string state, **not** `type="number"` with `.toFixed(2)` as the controlled value. The `.toFixed(2)` pattern reformats on every keystroke and breaks free typing. Store raw strings in state; parse to float only for calculations and on submit.

**Dashboard liabilities table** uses `src/components/dashboard/DeductionTable.tsx` (client component) instead of a plain server-rendered table, because each row needs Mark Paid / Undo buttons with per-row loading state.

**Investment category behaviour**: `category` on the `investments` table drives terminology, visible fields, and transaction types for all investment UI. `trading` → Buy/Sell + qty/price fields; `unit_trust` → Save/Redeem/Dividend, no qty/price; `savings` → Deposit/Withdraw/Dividend, no qty/price. Summary cards also vary per category (Net Invested vs Balance + Dividends). Always pass `category` down from the server page to `TransactionForm` and `TransactionList`.

### Timezone Handling

"Today" is always the user's device date, not the server's. The flow:

1. `<TimezoneSync />` (mounted in root layout as a client component) writes the device IANA timezone into a `tz` cookie on first render.
2. Server Components and Actions call `serverToday()` / `serverNow()` from `src/lib/server-date.ts`, which reads that cookie and uses `src/lib/date.ts` to compute the correct date string.
3. Never use `new Date()` directly on the server for "today" — use `serverToday()` / `serverNow()`.

### Month Navigation

Pages with month-scoped data (expenses, deductions, income history) accept a `?month=yyyy-MM-dd` search param (first of month). The `<MonthNav month={month} />` component in `src/components/MonthNav.tsx` renders prev/next arrows and updates the URL param. Server pages read the param via `searchParams`, defaulting to the current month via `serverToday()`.
