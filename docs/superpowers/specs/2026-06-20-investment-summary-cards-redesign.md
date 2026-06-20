# Investment Summary Cards Redesign

**Date:** 2026-06-20  
**Scope:** `src/app/investments/[id]/page.tsx` — trading category summary cards only

## Problem

Trading category renders up to 9 cards in a 3×3 grid. Feels cluttered on mobile and desktop. Unit trust / savings already render 4 cards — acceptable, no changes needed.

## Solution: Option A — 3 Hero Cards + Compact Stats Strip

### Hero Row

Grid: `grid-cols-2 sm:grid-cols-3 gap-3`

Cards rendered conditionally based on available data:

| Condition | Cards |
|---|---|
| `hasWalletTopup && hasQuantity` | Available in Wallet · Net Invested · Net Holding |
| `hasWalletTopup && !hasQuantity` | Available in Wallet · Net Invested |
| `!hasWalletTopup && hasQuantity` | Net Invested · Net Holding |
| `!hasWalletTopup && !hasQuantity` | Net Invested (full width) |

Colors: Available in Wallet = `text-blue-600`, Net Invested = `text-success`, Net Holding = default.  
Style: same `Card` + `CardContent` components, `text-2xl font-bold`.

### Stats Strip

Replaces all secondary cards. No card border — sits inline below hero row.

```
flex flex-wrap gap-x-5 gap-y-1 px-1 text-sm
```

Each stat: `<muted label> <medium value>` pairs separated by spacing.

Items (all conditional):
- **Wallet Deposited** — shown if `hasWalletTopup`
- **Total Bought** — always shown
- **Total Sold** — always shown
- **Fees Paid** — shown if `hasFees`
- **Qty Bought** — shown if `hasQuantity`
- **Qty Sold** — shown if `hasQuantity`

## Out of Scope

- Unit trust summary cards — no change
- Savings summary cards — no change
- TransactionForm — no change
- TransactionList — no change

## Files Changed

- `src/app/investments/[id]/page.tsx` — replace trading summary card grid with hero row + stats strip
