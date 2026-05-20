# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PocketBalance is a personal daily financial tracker. Users log monthly salary, set up recurring deductions (bills, subscriptions), record daily expenses, track debts, manage investments, and maintain a backup/emergency fund — with a running daily balance and carry-forward overspend logic.

**Currency**: All amounts displayed as Malaysian Ringgit (`RM`).

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=   # used for auth email redirect (e.g. https://yourdomain.com)
```

## Architecture

### Auth Flow

Auth is handled by `src/proxy.ts`, which is imported and re-exported by `src/app/middleware.ts`. It uses `@supabase/ssr` to refresh sessions via cookies and redirects unauthenticated users to `/login`. Auth routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`) redirect authenticated users to `/`. The email confirmation callback is at `src/app/auth/callback/route.ts`.

Supabase clients:
- `src/lib/supabase/server.ts` — for Server Components and Server Actions (cookie-based)
- `src/lib/supabase/client.ts` — for Client Components (`createBrowserClient`)

### Database Schema

All tables use `user_id UUID REFERENCES auth.users` with RLS (`FOR ALL USING (auth.uid() = user_id)`).

| Table | Purpose |
|---|---|
| `salaries` | One record per user per month (`month` = first day of month as DATE) |
| `deductions` | Recurring deduction templates (car, insurance, etc.) with `is_active` flag |
| `deduction_payments` | Per-month payment records against a deduction; `month` = first day of month |
| `expenses` | Daily expense entries with `expense_date` DATE and `created_at` TIMESTAMPTZ |
| `daily_targets` | Daily spending limit with `effective_from` DATE; most recent on/before today is active |
| `investments` | Investment account templates (name, type, is_active) |
| `investment_transactions` | Buy/sell transactions per investment; optional `quantity` and `price_per_unit` |
| `backup_fund_transactions` | Deposit/withdrawal to emergency fund |
| `debts` | Debts with `type` ('i_owe'/'they_owe'), `is_settled`, and `settled_date` |
| `profiles` | User profile; `username` (nullable); upserted on conflict of `user_id` |

Migrations live in `supabase/migrations/`. Username entered at signup is stored in `auth.users.raw_user_meta_data` via `options.data` and synced to `profiles` when edited via the profile page.

### Key Business Logic

**Daily budget with carry-forward** (computed in `src/app/actions/dashboard.ts`):
1. Monthly budget = salary − total active deductions
2. For each day from month start to yesterday: `carryForward = max(0, carryForward + spent − dailyTarget)`
3. Today's effective spend displayed as `carryForward + todaySpend` vs `dailyTarget`

**Deduction tracking**: `deductions` are templates; `deduction_payments` records which ones are paid each month. No cross-month carry-over.

### Route Structure

```
src/app/
  (auth)/               # Unauthenticated routes — redirects to / if logged in
    login/
    signup/
    forgot-password/
    reset-password/
  auth/callback/        # Supabase email confirmation handler (exchanges code for session)
  page.tsx              # Dashboard — summary cards + monthly liabilities table
  expenses/             # Daily expenses: QuickAddForm + ExpenseList (today) or MonthlyExpenseList
  salary/               # SalaryForm + SalaryHistory
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

**List components** (ExpenseList, DebtList, SalaryHistory, etc.) follow a consistent dual-view pattern:
- Mobile (`sm:hidden`): card list with `divide-y`, inline action buttons
- Desktop (`hidden sm:block`): `overflow-x-auto` table
- View detail dialog + edit dialog with inline form
- `loadingId` state for per-row delete/action spinners; `editLoading` for modal save spinner

**Forms** always use `onSubmit={e => { e.preventDefault(); handler(new FormData(e.currentTarget)) }}` — **never** `action={handler}`. Using `action=` wraps the call in a React transition which prevents loading spinners from showing.

**Dashboard liabilities table** uses `src/components/dashboard/DeductionTable.tsx` (client component) instead of a plain server-rendered table, because each row needs Mark Paid / Undo buttons with per-row loading state.
