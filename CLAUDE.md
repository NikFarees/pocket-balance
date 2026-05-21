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
| `investments` | Investment account templates (name, type, is_active) |
| `investment_transactions` | Buy/sell transactions per investment; optional `quantity` and `price_per_unit` |
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

### Component Patterns

**List components** (ExpenseList, DebtList, IncomeHistory, etc.) follow a consistent dual-view pattern:
- Mobile (`sm:hidden`): card list with `divide-y`, inline action buttons
- Desktop (`hidden sm:block`): `overflow-x-auto` table
- View detail dialog + edit dialog with inline form
- `loadingId` state for per-row delete/action spinners; `editLoading` for modal save spinner

**Forms** always use `onSubmit={e => { e.preventDefault(); handler(new FormData(e.currentTarget)) }}` — **never** `action={handler}`. Using `action=` wraps the call in a React transition which prevents loading spinners from showing.

**Editable number inputs in forms**: use `type="text"` + `inputMode="decimal"` with string state, **not** `type="number"` with `.toFixed(2)` as the controlled value. The `.toFixed(2)` pattern reformats on every keystroke and breaks free typing. Store raw strings in state; parse to float only for calculations and on submit.

**Dashboard liabilities table** uses `src/components/dashboard/DeductionTable.tsx` (client component) instead of a plain server-rendered table, because each row needs Mark Paid / Undo buttons with per-row loading state.
