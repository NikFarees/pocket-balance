# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PocketBalance is a personal daily financial tracker. Users log their monthly salary, set up recurring deductions (bills, subscriptions), record daily expenses, and see a running balance with carry-forward overspend logic.

## Tech Stack

- **Next.js** (App Router, TypeScript)
- **Supabase** — PostgreSQL database + Auth (email/password)
- **Tailwind CSS**
- **Deployment**: Vercel via GitHub

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
```

## Architecture

### Auth

Supabase Auth handles sign-up/login. A `useUser` hook (or context) exposes the current session. All app routes under `app/(protected)/` require an authenticated session — middleware redirects unauthenticated users to `/login`.

### Database Schema

Six tables, all with `user_id` foreign keys for row-level security:

| Table | Purpose |
|---|---|
| `salaries` | One record per user per month (`month` = first day of month) |
| `deductions` | Recurring deduction templates (car payment, insurance, etc.) |
| `deduction_payments` | Per-month payment records against a deduction |
| `expenses` | Daily expense entries |
| `daily_targets` | User's daily spending target (RM amount), with `effective_from` date |

Supabase Auth manages the `users` table via `auth.users`.

### Key Business Logic

**Monthly deduction tracking**: `deductions` are templates. Each month the user marks them paid via `deduction_payments`. There is no carry-over — unpaid deductions from last month do not appear as paid this month.

**Daily budget with carry-forward**:
1. Monthly budget = salary − total paid deductions
2. Daily target = monthly budget / remaining days in month
3. If yesterday's spending exceeded the target, overspend carries forward: today's effective target = daily_target − yesterday's overspend

**Currency**: All amounts displayed as Malaysian Ringgit (`RM`).

### Route Structure (App Router)

```
app/
  (auth)/
    login/          # Sign in page
    signup/         # Register page
  (protected)/      # Requires auth (middleware-gated)
    page.tsx        # Dashboard — salary overview + deduction status table
    expenses/       # Daily expense view with quick-add form
    salary/         # Salary management (add/edit per month)
    deductions/     # Deduction template management
    settings/       # Daily target configuration
```

### Data Flow

- Supabase client is instantiated in `lib/supabase.ts` (browser) and `lib/supabase-server.ts` (server components/actions)
- Server Actions (Next.js) handle all mutations — no separate API routes
- RLS policies on all tables ensure users can only read/write their own rows

## Supabase Setup

SQL to create tables lives in `supabase/migrations/`. Run via Supabase dashboard SQL editor or `supabase db push`. Enable RLS on all tables and add policies like:

```sql
CREATE POLICY "Users own their data" ON expenses
  FOR ALL USING (auth.uid() = user_id);
```
