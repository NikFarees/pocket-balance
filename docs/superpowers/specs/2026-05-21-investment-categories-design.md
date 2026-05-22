# Investment Categories Design

**Date:** 2026-05-21  
**Status:** Approved

## Overview

Add a structured `category` field to investment accounts so that terminology, visible fields, available transaction types, and summary calculations adapt to how each account actually works. Three categories: `trading`, `unit_trust`, `savings`.

## Categories

### trading
Gold (Maybank MiGA, Public Gold), stocks, crypto. You buy an asset and sell it later.
- Transaction types: **Buy**, **Sell**
- Fields: Amount (RM), Date, Quantity (optional), Price per unit (optional)
- Summary: Total Invested, Total Sold, Net Invested (= Invested − Sold), Net Quantity

### unit_trust
ASNB, Public Mutual, Maybank unit trust funds. You save regularly into a fund and redeem when needed. Fund pays annual dividends.
- Transaction types: **Save**, **Redeem**, **Dividend**
- Fields: Amount (RM), Date only (no qty/price)
- Summary: Total Saved, Total Redeemed, Total Dividends, Balance (= Saved + Dividends − Redeemed)

### savings
Tabung Haji, BSN, fixed deposit-style. Pure deposit account earning annual hibah/dividend.
- Transaction types: **Deposit**, **Withdraw**, **Dividend**
- Fields: Amount (RM), Date only (no qty/price)
- Summary: Total Deposited, Total Withdrawn, Total Dividends, Balance (= Deposited + Dividends − Withdrawn)

### Dividend handling (unit_trust + savings)
Dividends count as an inflow — they are included in the balance. Balance = inflows (deposits/saves + dividends) − outflows (withdrawals/redemptions). No separate line in the summary card; it is an additive part of the balance.

## Data Layer

### investments table — new column
```sql
ALTER TABLE investments
  ADD COLUMN category TEXT NOT NULL DEFAULT 'trading'
  CHECK (category IN ('trading', 'unit_trust', 'savings'));
```

### Migration — auto-map existing rows
```sql
UPDATE investments SET category = CASE
  WHEN lower(type) LIKE '%gold%'                                    THEN 'trading'
  WHEN lower(type) LIKE '%unit trust%' OR lower(type) LIKE '%unit_trust%' THEN 'unit_trust'
  WHEN lower(type) LIKE '%savings%' OR lower(type) LIKE '%tabung%' THEN 'savings'
  ELSE 'trading'
END;
```

### investment_transactions — no schema change
`type` is validated in the app layer only. Add `'dividend'` as a third valid value alongside `'buy'` and `'sell'`.

## UI Changes

### Create / Edit Investment form
Replace the free-text `type` input with a segmented category selector:

```
Account Name: [_____________]
Category:     [Trading] [Unit Trust] [Savings]   ← required, segmented control
Notes:        [_____________]                     (optional)
```

The `type` column is retired from the form. Existing data in `type` is preserved in the DB but no longer shown or edited.

### Transaction form (add + edit modal)
Receives `investmentCategory` prop. Adapts accordingly:

| category | Button 1 (green) | Button 2 (red) | Button 3 (neutral) | Qty/Price fields |
|---|---|---|---|---|
| trading | Buy | Sell | — | visible |
| unit_trust | Save | Redeem | Dividend | hidden |
| savings | Deposit | Withdraw | Dividend | hidden |

Dividend button styling: neutral (not green or red) since it is neither money in from you nor money out.

### Transaction list — badge labels
Map stored `type` value + investment category to display label:

| stored type | trading badge | unit_trust badge | savings badge |
|---|---|---|---|
| `buy` | Buy (green) | Save (green) | Deposit (green) |
| `sell` | Sell (red) | Redeem (red) | Withdraw (red) |
| `dividend` | — | Dividend (neutral) | Dividend (neutral) |

Amount prefix: `+` for buy/dividend, `−` for sell.

### Investment detail page — summary card
Pass `category` from the server-fetched investment down to `TransactionList` and the summary card.

Summary card per category:

**trading:**
- Total Invested: RM X
- Total Sold: RM X
- Net Invested: RM X
- Net Quantity: X (only if any transaction has quantity)

**unit_trust:**
- Total Saved: RM X
- Total Redeemed: RM X
- Total Dividends: RM X
- Balance: RM X

**savings:**
- Total Deposited: RM X
- Total Withdrawn: RM X
- Total Dividends: RM X
- Balance: RM X

## Server Actions

### addTransaction / updateTransaction
- Valid types: `['buy', 'sell', 'dividend']`
- `dividend` transactions: quantity and price_per_unit are always null (ignored if submitted)

### getInvestmentWithTransactions
Extend summary computation to handle all three transaction types:

```
// trading (existing logic, unchanged)
totalBought = sum(buy amounts)
totalSold   = sum(sell amounts)
netInvested = totalBought - totalSold

// unit_trust / savings (new)
totalIn       = sum(buy amounts)       // saves or deposits
totalOut      = sum(sell amounts)      // redeems or withdrawals
totalDividend = sum(dividend amounts)
balance       = totalIn + totalDividend - totalOut
```

The summary object always includes all fields; the UI picks which ones to display based on category.

## Out of Scope

- Changing the `investments` list page badge (it currently shows the `type` text; after this change it will show the `category` label: "Trading", "Unit Trust", "Savings")
- Showing investments summary on the main Dashboard — no change
- Editing the `type` column via UI — it stays in the DB but is no longer surfaced
