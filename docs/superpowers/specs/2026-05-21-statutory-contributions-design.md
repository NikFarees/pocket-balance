# Statutory Contributions on Income Entries

**Date:** 2026-05-21
**Status:** Approved

## Problem

The income feature tracks what you receive, but not what gets deducted before the money hits your bank account. Malaysian employees have EPF (KWSP), SOCSO (PERKESO), EIS (SIP), and PCB (tax) deducted every month — from both employee and employer sides. Without tracking these, the budget is missing the gross→net picture and there's no way to see how your EPF savings are growing over time.

## Scope

This applies **only to salary-type income entries**. The statutory contributions section is an optional collapsible toggle inside the income form. Side income entries (Shopee, gifts, etc.) leave it collapsed and are unaffected.

---

## Data Model

New nullable columns on the existing `incomes` table:

| Column | Type | Description |
|---|---|---|
| `gross_amount` | NUMERIC(12,2) | Gross salary before deductions |
| `epf_employee` | NUMERIC(12,2) | KWSP employee contribution |
| `epf_employer` | NUMERIC(12,2) | KWSP employer contribution |
| `socso_employee` | NUMERIC(12,2) | PERKESO employee contribution |
| `socso_employer` | NUMERIC(12,2) | PERKESO employer contribution |
| `eis_employee` | NUMERIC(12,2) | SIP employee contribution |
| `eis_employer` | NUMERIC(12,2) | SIP employer contribution |
| `tax_pcb` | NUMERIC(12,2) | PCB monthly tax deduction (employee only) |

All columns nullable. When `gross_amount` is null, the entry has no statutory breakdown (legacy and non-salary entries).

**Net calculation:**
`amount` (existing field) = `gross_amount − (epf_employee + socso_employee + eis_employee + tax_pcb)`

This means: the existing `amount` field always stores net take-home. Dashboard budget logic is unchanged — it already sums `amount`.

---

## Auto-Calculation Rates

Applied when user opens the contributions section and enters a gross amount. All fields are editable after auto-fill.

| Contribution | Employer | Employee |
|---|---|---|
| EPF (KWSP) | 13% (gross ≤ RM5,000) / 12% (gross > RM5,000) | 11% |
| SOCSO (PERKESO) | 1.75% | 0.5% |
| EIS (SIP) | 0.2% | 0.2% |
| PCB (Tax) | — | 0 (manual, from payslip) |

Rates match standard Malaysian statutory rates as per real payslips. SOCSO and EIS have wage ceilings in reality (contributions cap above RM5,000 gross) — the app computes simple percentages and lets the user override to the exact payslip amount.

---

## Income Form Changes

The existing `IncomeForm` gains an optional collapsible section:

- Section label: **"Statutory Contributions (Optional)"**
- Only available when entry type = `Income` (not `Adjustment`)
- Collapsed by default; toggling open reveals the full breakdown

**When opened:**
1. The "Amount" field label changes to **"Gross Salary (RM)"**
2. A breakdown table appears below (matching payslip layout):

```
                    Employer        Employee
KWSP (EPF)         [auto-filled]   [auto-filled]
PERKESO (SOCSO)    [auto-filled]   [auto-filled]
SIP (EIS)          [auto-filled]   [auto-filled]
PCB (Tax)               —          [manual, default 0]
```

3. Each field is editable; changing gross re-computes all auto fields
4. A live read-only preview at the bottom: **"Net Salary: RM X"**

**Form submission:**
- If section is collapsed: `gross_amount` = null, contribution fields = null, `amount` = whatever the user typed (treated as net directly)
- If section is open: `amount` = `gross_amount − employee deductions`, all contribution columns populated

---

## EPF Summary Card

On the `/income` page, above the history table, a new summary card:

```
EPF / KWSP Accumulated

Your contribution (employee)   RM X,XXX.XX
Employer's contribution        RM X,XXX.XX
─────────────────────────────────────────
Total                          RM X,XXX.XX
```

Computed by summing `epf_employee` and `epf_employer` across **all income entries ever** (not just current month). Entries where these fields are null contribute 0. The card is hidden if there are no entries with EPF data yet.

---

## Income History Changes

**List view** (both mobile cards and desktop table):
- Entries with `gross_amount` set: display gross amount + a small muted badge "Net: RM X"
- Entries without: display `amount` as before

**View detail dialog:**
- Entries with contributions: show payslip-style breakdown table:
  ```
  Basic Salary              RM 3,500.00
  Statutory Deductions       (RM 410.85)

                    Employer    Employee    Total
  KWSP (EPF)        455.00      385.00     840.00
  PERKESO (SOCSO)    60.35       17.25      77.60
  SIP (EIS)           6.90        6.90      13.80
  PCB (Tax)             —         1.70       1.70

  Net Salary                    RM 3,089.15
  ```
- Entries without: show as before (no statutory section)

**Edit dialog:**
- Prefills the contributions section open if the entry has `gross_amount` set
- Prefills closed if no statutory data

---

## Files to Change

| File | Change |
|---|---|
| `supabase/migrations/005_income_contributions.sql` | ALTER TABLE incomes ADD COLUMN (×8 nullable columns) |
| `src/app/actions/income.ts` | `createIncome` and `updateIncome` read and persist contribution fields; compute net |
| `src/app/income/IncomeForm.tsx` | Add collapsible statutory section with auto-calc and net preview |
| `src/app/income/IncomeHistory.tsx` | Gross+net badge in list; payslip-style view dialog; prefill edit |
| `src/app/income/page.tsx` | Fetch EPF totals, render EPF summary card |

---

## Verification

1. Apply migration — `incomes` table has 8 new nullable columns
2. `npm run build` passes with no TypeScript errors
3. Manual test:
   - Add a salary entry, open contributions, enter RM 3,500 gross
   - EPF employee auto-fills 385, employer 455; SOCSO 17.50/61.25; EIS 7.00/7.00; PCB 0
   - Edit PCB to 1.70; net preview shows RM 3,089.30 (close to payslip; minor rounding from payslip is expected since SOCSO uses contribution tables)
   - Save → history shows "RM 3,500.00 / Net: RM 3,089.xx"
   - View detail → payslip-style table renders correctly
   - EPF summary card shows employee RM 385, employer RM 455, total RM 840
   - Add a Shopee income entry (RM 150) without opening contributions → no statutory columns, amount = 150 as before
   - Dashboard daily budget reflects net salary (3,089.xx) + Shopee (150), not gross
