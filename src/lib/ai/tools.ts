/**
 * Tool schema shape. Written in Anthropic's `input_schema` form and converted to
 * Gemini `functionDeclarations` at runtime in the assistant route. Kept as a local
 * type so the app does not depend on the Anthropic SDK package.
 */
import { EXPENSE_CATEGORIES } from '@/lib/validation'

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Tool + prompt definitions for the PocketBalance assistant.
 *
 * Two categories:
 *  - WRITE tools: the route does NOT execute these. When Claude calls one, the
 *    route returns the parsed params to the client as a confirmation proposal,
 *    and the client calls the matching existing server action after the user
 *    confirms. Keeps all DB writes flowing through the existing actions.
 *  - READ tools: executed server-side by `queries.ts`, fed back to Claude so it
 *    can answer questions and give insights.
 *
 * These definitions are static so they cache well across requests — keep them
 * free of per-request values (dates, user data). Today's date is injected into
 * the system prompt by the route instead.
 */

export const WRITE_TOOL_NAMES = new Set([
  // create
  'add_expense',
  'add_income',
  'add_debt',
  'add_backup_transaction',
  'add_investment_transaction',
  // update
  'update_expense',
  'update_income',
  'update_debt',
  'update_backup_transaction',
  'update_investment_transaction',
  // delete
  'delete_expense',
  'delete_income',
  'delete_debt',
  'delete_backup_transaction',
  'delete_investment_transaction',
  // debts: settle / payment
  'settle_debt',
  'unsettle_debt',
  'add_debt_payment',
  // investments (the account)
  'add_investment',
  'update_investment',
  'delete_investment',
  'toggle_investment',
  // deductions (liabilities)
  'add_deduction',
  'update_deduction',
  'delete_deduction',
  'toggle_deduction',
  'mark_deduction_paid',
  // subscriptions (lite: renew / toggle / delete)
  'renew_subscription',
  'toggle_subscription',
  'delete_subscription',
  // notes
  'add_note',
  'update_note',
  'delete_note',
  // daily target
  'set_daily_target',
  'delete_daily_target',
])

export const READ_TOOL_NAMES = new Set([
  'get_today_status',
  'get_month_summary',
  'get_backup_balance',
  'get_debts_summary',
  'get_notes',
  'find_entries',
])

export const TOOLS: Tool[] = [
  // ---- WRITE TOOLS (propose-then-confirm) ----
  {
    name: 'add_expense',
    description:
      'Record a daily expense (money the user spent). Use for anything the user bought or paid for, e.g. "RM5 for lunch", "spent 30 ringgit on petrol". Call this when the user describes spending money on a purchase.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount spent in Malaysian Ringgit (RM). Must be positive.' },
        description: { type: 'string', description: 'Short description of the expense, e.g. "Lunch at mamak".' },
        category: { type: 'string', enum: [...EXPENSE_CATEGORIES], description: 'Expense category. Pick the closest from the list; use "Other" if none fit. Omit only if truly unclear.' },
        expense_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to use today." },
      },
      required: ['amount', 'description'],
    },
  },
  {
    name: 'add_income',
    description:
      'Record income the user received (salary, side income, gift, etc.) as a simple net amount. Use when the user says they earned or received money, e.g. "got RM200 from a side gig". For detailed salary with EPF/SOCSO/tax breakdowns, tell the user to use the Income form instead.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Net amount received in RM. Positive for income.' },
        source: { type: 'string', description: 'Where the income came from, e.g. "Salary", "Freelance", "Gift".' },
        income_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to use today." },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['amount', 'source'],
    },
  },
  {
    name: 'add_debt',
    description:
      'Record a debt. Use "they_owe" when someone owes the user money (e.g. "I lent Ali RM50", "Ali owes me 50"), and "i_owe" when the user owes someone (e.g. "I borrowed RM100 from mom").',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['i_owe', 'they_owe'], description: 'they_owe = someone owes the user; i_owe = the user owes someone.' },
        person_name: { type: 'string', description: 'The other person\'s name.' },
        amount: { type: 'number', description: 'Debt amount in RM. Must be positive.' },
        description: { type: 'string', description: 'Optional reason for the debt.' },
        due_date: { type: 'string', description: "Optional due date in 'yyyy-MM-dd'." },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['type', 'person_name', 'amount'],
    },
  },
  {
    name: 'add_backup_transaction',
    description:
      'Record a deposit into or withdrawal from the emergency/backup fund. Use when the user says they put money aside into savings/emergency fund ("deposit"), or took money out of it ("withdrawal").',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['deposit', 'withdrawal'], description: 'deposit = money added to the fund; withdrawal = money taken out.' },
        amount: { type: 'number', description: 'Amount in RM. Must be positive.' },
        description: { type: 'string', description: 'Optional description.' },
        location: { type: 'string', description: 'Optional location where the fund is kept, e.g. "Bank account".' },
        transaction_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to use today." },
      },
      required: ['type', 'amount'],
    },
  },
  {
    name: 'add_investment_transaction',
    description:
      'Record a transaction against one of the user\'s existing investments (by name). type: "buy" (bought/invested/deposited), "sell" (sold/redeemed/withdrew), or "dividend". The investment must already exist; if unsure of the exact name, ask the user. quantity and price_per_unit only apply to trading investments (gold, stocks) and are ignored for dividends.',
    input_schema: {
      type: 'object',
      properties: {
        investment_name: { type: 'string', description: 'Name of an existing investment, e.g. "ASNB", "Gold".' },
        type: { type: 'string', enum: ['buy', 'sell', 'dividend'], description: 'buy/sell/dividend.' },
        amount: { type: 'number', description: 'Amount in RM. Must be positive.' },
        quantity: { type: 'number', description: 'Optional units (trading investments only).' },
        price_per_unit: { type: 'number', description: 'Optional price per unit in RM (trading investments only).' },
        transaction_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to use today." },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['investment_name', 'type', 'amount'],
    },
  },

  // ---- UPDATE TOOLS (propose-then-confirm) ----
  // Always call find_entries first to get the real `id`, then carry over any
  // fields the user did NOT change from the found row (these actions replace,
  // not patch).
  {
    name: 'update_expense',
    description:
      'Edit an existing expense. Requires the expense `id` from find_entries. The expense date cannot be changed here. Provide the full new values; copy unchanged fields from the found row.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Expense id from find_entries.' },
        amount: { type: 'number', description: 'New amount in RM (positive).' },
        description: { type: 'string', description: 'New description.' },
        category: { type: 'string', enum: [...EXPENSE_CATEGORIES], description: 'Expense category from the fixed list; use "Other" if none fit.' },
      },
      required: ['id', 'amount', 'description'],
    },
  },
  {
    name: 'update_income',
    description:
      'Edit an existing income entry. Requires the income `id` from find_entries. Provide the full new values; copy unchanged fields from the found row.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Income id from find_entries.' },
        amount: { type: 'number', description: 'New net amount in RM.' },
        source: { type: 'string', description: 'New source.' },
        income_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to keep today." },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['id', 'amount', 'source'],
    },
  },
  {
    name: 'update_debt',
    description:
      'Edit an existing debt. Requires the debt `id` from find_entries. The debt direction (i_owe/they_owe) cannot be changed here. Provide the full new values; copy unchanged fields from the found row.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Debt id from find_entries.' },
        person_name: { type: 'string', description: 'New person name.' },
        amount: { type: 'number', description: 'New amount in RM (positive).' },
        description: { type: 'string', description: 'Optional reason.' },
        due_date: { type: 'string', description: "Optional due date in 'yyyy-MM-dd'." },
      },
      required: ['id', 'person_name', 'amount'],
    },
  },
  {
    name: 'update_backup_transaction',
    description:
      'Edit an existing backup-fund transaction. Requires the `id` from find_entries. Provide the full new values; copy unchanged fields from the found row.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction id from find_entries.' },
        type: { type: 'string', enum: ['deposit', 'withdrawal'], description: 'deposit or withdrawal.' },
        amount: { type: 'number', description: 'New amount in RM (positive).' },
        description: { type: 'string', description: 'Optional description.' },
        location: { type: 'string', description: 'Optional location.' },
        transaction_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to keep today." },
      },
      required: ['id', 'type', 'amount'],
    },
  },
  {
    name: 'update_investment_transaction',
    description:
      'Edit an existing investment transaction. Requires both `id` and `investment_id` from find_entries. Provide the full new values; copy unchanged fields from the found row.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction id from find_entries.' },
        investment_id: { type: 'string', description: 'Parent investment id from find_entries.' },
        type: { type: 'string', enum: ['buy', 'sell', 'dividend'], description: 'buy/sell/dividend.' },
        amount: { type: 'number', description: 'New amount in RM (positive).' },
        quantity: { type: 'number', description: 'Optional units (trading only).' },
        price_per_unit: { type: 'number', description: 'Optional price per unit (trading only).' },
        transaction_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to keep today." },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['id', 'investment_id', 'type', 'amount'],
    },
  },

  // ---- DELETE TOOLS (propose-then-confirm) ----
  // Always call find_entries first. `summary` is a short human label copied from
  // the found row (e.g. "RM5.00 — Lunch, 2026-05-31"); it is only used to render
  // the confirmation card.
  {
    name: 'delete_expense',
    description: 'Delete an expense. Requires the `id` from find_entries.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Expense id from find_entries.' },
        summary: { type: 'string', description: 'Short human label of the row being deleted.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'delete_income',
    description: 'Delete an income entry. Requires the `id` from find_entries.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Income id from find_entries.' },
        summary: { type: 'string', description: 'Short human label of the row being deleted.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'delete_debt',
    description: 'Delete a debt. Requires the `id` from find_entries.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Debt id from find_entries.' },
        summary: { type: 'string', description: 'Short human label of the row being deleted.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'delete_backup_transaction',
    description: 'Delete a backup-fund transaction. Requires the `id` from find_entries.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction id from find_entries.' },
        summary: { type: 'string', description: 'Short human label of the row being deleted.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'delete_investment_transaction',
    description: 'Delete an investment transaction. Requires both `id` and `investment_id` from find_entries.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction id from find_entries.' },
        investment_id: { type: 'string', description: 'Parent investment id from find_entries.' },
        summary: { type: 'string', description: 'Short human label of the row being deleted.' },
      },
      required: ['id', 'investment_id', 'summary'],
    },
  },

  // ---- DEBTS: settle / unsettle / record payment ----
  {
    name: 'settle_debt',
    description:
      "Mark a debt as settled / paid-off / cancelled. Use when the user says a debt is done, cleared, paid back, or to cancel it. Get the `id` from find_entries(kind:'debt'); do NOT delete the debt for this.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Debt id from find_entries(kind:'debt')." },
        summary: { type: 'string', description: 'Short human label of the debt, e.g. "Ali — RM50".' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'unsettle_debt',
    description: "Re-open a previously settled debt (mark it unsettled again). Get the `id` from find_entries(kind:'debt').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Debt id from find_entries(kind:'debt')." },
        summary: { type: 'string', description: 'Short human label of the debt.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'add_debt_payment',
    description:
      "Record a partial payment toward a debt (the debt auto-settles once fully paid). Use when the user pays back part of what they owe / collects part of what's owed to them. Get `debt_id` from find_entries(kind:'debt').",
    input_schema: {
      type: 'object',
      properties: {
        debt_id: { type: 'string', description: "Debt id from find_entries(kind:'debt')." },
        amount: { type: 'number', description: 'Payment amount in RM. Must be positive.' },
        paid_date: { type: 'string', description: "Date in 'yyyy-MM-dd'. Omit to use today." },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['debt_id', 'amount'],
    },
  },

  // ---- INVESTMENTS (the account itself) ----
  {
    name: 'add_investment',
    description:
      'Create a new investment account/holding. category: "trading" (gold/stocks — buy/sell with quantity), "unit_trust" (e.g. ASNB — save/redeem/dividend), or "savings" (e.g. Tabung Haji — deposit/withdraw/dividend). Ask the user which category if it is not clear. To log a buy/sell/dividend on an EXISTING investment, use add_investment_transaction instead.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the investment, e.g. "ASNB", "Gold", "Tabung Haji".' },
        category: { type: 'string', enum: ['trading', 'unit_trust', 'savings'], description: 'trading / unit_trust / savings.' },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['name', 'category'],
    },
  },
  {
    name: 'update_investment',
    description: "Edit an existing investment's name, category, or notes. Get the `id` from find_entries(kind:'investment').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Investment id from find_entries(kind:'investment')." },
        name: { type: 'string', description: 'New name.' },
        category: { type: 'string', enum: ['trading', 'unit_trust', 'savings'], description: 'trading / unit_trust / savings.' },
        notes: { type: 'string', description: 'Optional notes.' },
      },
      required: ['id', 'name', 'category'],
    },
  },
  {
    name: 'delete_investment',
    description: "Delete an investment AND all of its transactions. Get the `id` from find_entries(kind:'investment'). This is irreversible.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Investment id from find_entries(kind:'investment')." },
        summary: { type: 'string', description: 'Short human label of the investment.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'toggle_investment',
    description: "Archive or re-activate an investment. Set `active` to the desired end state (true = active, false = archived). Get the `id` from find_entries(kind:'investment').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Investment id from find_entries(kind:'investment')." },
        active: { type: 'boolean', description: 'Desired state: true = active, false = archived.' },
        summary: { type: 'string', description: 'Short human label of the investment.' },
      },
      required: ['id', 'active', 'summary'],
    },
  },

  // ---- DEDUCTIONS (recurring liabilities) ----
  {
    name: 'add_deduction',
    description:
      'Create a recurring liability / deduction (e.g. car loan, insurance, rent) with a monthly expected amount. due_date is the day of the month (1–31) it is due.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the liability, e.g. "Car loan", "Astro".' },
        expected_amount: { type: 'number', description: 'Expected monthly amount in RM. Must be positive.' },
        due_date: { type: 'number', description: 'Optional day of month it is due (1–31).' },
        category: { type: 'string', description: 'Optional category.' },
      },
      required: ['name', 'expected_amount'],
    },
  },
  {
    name: 'update_deduction',
    description: "Edit a recurring liability. Get the `id` from find_entries(kind:'deduction').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Liability id from find_entries(kind:'deduction')." },
        name: { type: 'string', description: 'New name.' },
        expected_amount: { type: 'number', description: 'New expected monthly amount in RM.' },
        due_date: { type: 'number', description: 'Optional day of month (1–31).' },
        category: { type: 'string', description: 'Optional category.' },
      },
      required: ['id', 'name', 'expected_amount'],
    },
  },
  {
    name: 'delete_deduction',
    description: "Delete a recurring liability. Get the `id` from find_entries(kind:'deduction').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Liability id from find_entries(kind:'deduction')." },
        summary: { type: 'string', description: 'Short human label of the liability.' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'toggle_deduction',
    description: "Pause or re-activate a recurring liability. Set `active` to the desired end state (true = active, false = paused). Get the `id` from find_entries(kind:'deduction').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Liability id from find_entries(kind:'deduction')." },
        active: { type: 'boolean', description: 'Desired state: true = active, false = paused.' },
        summary: { type: 'string', description: 'Short human label of the liability.' },
      },
      required: ['id', 'active', 'summary'],
    },
  },
  {
    name: 'mark_deduction_paid',
    description:
      "Mark a recurring liability as paid for the current month. Get `deduction_id` from find_entries(kind:'deduction'); default `amount` to that liability's expected_amount unless the user gives a different amount.",
    input_schema: {
      type: 'object',
      properties: {
        deduction_id: { type: 'string', description: "Liability id from find_entries(kind:'deduction')." },
        amount: { type: 'number', description: 'Amount paid in RM (usually the expected_amount).' },
      },
      required: ['deduction_id', 'amount'],
    },
  },

  // ---- SUBSCRIPTIONS (renew / toggle / delete — no create/edit here) ----
  {
    name: 'renew_subscription',
    description:
      "Renew a subscription: advances its next renewal date by its billing cycle and logs the renewal. Get the `id` from find_entries(kind:'subscription'). To CREATE or EDIT a subscription, tell the user to use the Subscriptions form (it has too many fields for chat).",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Subscription id from find_entries(kind:'subscription')." },
        summary: { type: 'string', description: 'Short human label of the subscription, e.g. "Netflix".' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'toggle_subscription',
    description: "Pause or resume a subscription. Set `active` to the desired end state (true = active, false = paused). Get the `id` from find_entries(kind:'subscription').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Subscription id from find_entries(kind:'subscription')." },
        active: { type: 'boolean', description: 'Desired state: true = active, false = paused.' },
        summary: { type: 'string', description: 'Short human label of the subscription.' },
      },
      required: ['id', 'active', 'summary'],
    },
  },
  {
    name: 'delete_subscription',
    description: "Delete / cancel a subscription. Get the `id` from find_entries(kind:'subscription').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Subscription id from find_entries(kind:'subscription')." },
        summary: { type: 'string', description: 'Short human label of the subscription.' },
      },
      required: ['id', 'summary'],
    },
  },

  // ---- NOTES ----
  {
    name: 'add_note',
    description: 'Create a new note (free-form plan/target/info). body is plain text.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title.' },
        body: { type: 'string', description: 'Optional note body (plain text).' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_note',
    description: "Edit a note's title or body. Get the `id` from find_entries(kind:'note'). Provide the full new title; copy the unchanged one if only editing the body.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Note id from find_entries(kind:'note')." },
        title: { type: 'string', description: 'New title.' },
        body: { type: 'string', description: 'New body (plain text).' },
      },
      required: ['id', 'title'],
    },
  },
  {
    name: 'delete_note',
    description: "Delete a note. Get the `id` from find_entries(kind:'note').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Note id from find_entries(kind:'note')." },
        summary: { type: 'string', description: 'Short human label of the note (its title).' },
      },
      required: ['id', 'summary'],
    },
  },

  // ---- DAILY TARGET ----
  {
    name: 'set_daily_target',
    description:
      'Set the daily spending limit/target, effective from a date (defaults today). This adds a new effective-from entry to the target history rather than editing in place.',
    input_schema: {
      type: 'object',
      properties: {
        daily_amount: { type: 'number', description: 'New daily spending target in RM. Must be positive.' },
        effective_from: { type: 'string', description: "Date the target takes effect, 'yyyy-MM-dd'. Omit for today." },
      },
      required: ['daily_amount'],
    },
  },
  {
    name: 'delete_daily_target',
    description: "Delete a daily-target history entry. Get the `id` from find_entries(kind:'daily_target').",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "Daily-target id from find_entries(kind:'daily_target')." },
        summary: { type: 'string', description: 'Short human label of the target entry.' },
      },
      required: ['id', 'summary'],
    },
  },

  // ---- READ TOOLS (executed server-side) ----
  {
    name: 'get_today_status',
    description:
      "Get today's spending status: how much was spent today, the daily target, the carry-forward overspend from previous days, the effective target after carry-forward, and how much is left. Call this to answer questions like \"how much can I spend today?\" or \"am I over budget today?\".",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_month_summary',
    description:
      'Get a summary of a month: total income, total expenses, total recurring deductions, the resulting net, and a per-category expense breakdown (`by_category`: each fixed category with its total for the month). Call this to answer "how much did I spend this month?", "where is my money going?", or "how much on food this month?".',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: "First day of the month in 'yyyy-MM-dd' (e.g. '2026-05-01'). Omit for the current month." },
      },
    },
  },
  {
    name: 'get_backup_balance',
    description: 'Get the emergency/backup fund balance: total deposited, total withdrawn, and current balance.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_debts_summary',
    description: 'Get a summary of unsettled debts: total others owe the user and total the user owes others, with per-person breakdowns.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_notes',
    description:
      "Read the user's saved notes — free-form notes they wrote, such as future plans, monthly targets, where their backup money is, or account info. Returns each note's title and plain-text content (formatting stripped), newest first. Call this whenever the user asks about their notes/plans (e.g. \"read my notes\", \"what's my plan\", \"is that plan good?\"). Optionally narrow with `contains` (a text fragment in the title or body).",
    input_schema: {
      type: 'object',
      properties: {
        contains: { type: 'string', description: 'Optional text fragment to match in a note title or body.' },
        limit: { type: 'number', description: 'Max notes to return (default 10).' },
      },
    },
  },
  {
    name: 'find_entries',
    description:
      "Look up the user's existing records (with their database IDs) so you can target a specific one for any edit, delete, settle, toggle, renew, mark-paid, or payment tool. ALWAYS call this before such a tool, and use only the IDs it returns. `kind` selects the record type: 'debt' returns is_settled; 'investment'/'deduction'/'subscription' return is_active. Optionally narrow with `date` (a single day, where applicable) or `contains` (a text fragment matching the description / person / name / title).",
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['expense', 'income', 'debt', 'backup', 'investment_transaction', 'investment', 'deduction', 'subscription', 'note', 'daily_target'],
          description: 'Which kind of record to look up.',
        },
        date: { type: 'string', description: "Optional 'yyyy-MM-dd' to filter to a single day." },
        contains: { type: 'string', description: 'Optional text fragment to match.' },
        limit: { type: 'number', description: 'Max rows to return (default 10).' },
      },
      required: ['kind'],
    },
  },
]

export function systemPrompt(today: string): string {
  return [
    'You are the assistant for PocketBalance, a personal daily finance tracker.',
    'You help the user log financial entries and answer questions about their money, by voice or text.',
    '',
    'Rules:',
    `- Today's date is ${today} (the user's local date). All currency is Malaysian Ringgit (RM).`,
    '- To record something, call the matching add_* write tool. The app shows the user a confirmation card before saving — you do NOT save directly, so never claim an entry was saved.',
    '- To EDIT or DELETE an entry: first call find_entries to get the matching row(s) and their IDs, then call the matching update_*/delete_* tool with an `id` it returned. Never use an `id` you did not get from find_entries this turn. If more than one row matches, ask the user which one. For updates, copy over any fields the user did not change from the found row (these tools replace the whole entry).',
    '- After find_entries returns, you MUST either call the matching update_*/delete_* tool (when exactly one row clearly matches) or ask one short clarifying question. Never end your turn with an empty reply.',
    '- The conversation history includes lines like "Done: Add expense ..." or "User cancelled: ..." describing your earlier actions. Use them to resolve follow-ups such as "remove it", "delete that", or "the dinner one" — they refer to those recent entries; look them up with find_entries and act.',
    '- To answer a question about the user\'s finances, call a read tool (get_today_status, get_month_summary, get_backup_balance, get_debts_summary) and base your answer ONLY on the returned data. Never invent numbers.',
    '- To answer anything about the user\'s notes or plans, call get_notes and base your answer ONLY on the returned note content. If they ask you to assess a plan, read the notes first with get_notes, then give your view.',
    `- When the user states an amount and a purpose (e.g. "RM5 for lunch"), call add_expense. The expense category is a FIXED set — exactly one of: ${EXPENSE_CATEGORIES.join(', ')}. Pick the closest match (lunch/food/drinks → "Food & Drinks"; petrol/grab/parking → "Transport"; clothes/Shopee → "Shopping"; clinic/medicine → "Health"); use "Other" when nothing fits. Never invent a category outside this list.`,
    '- Expense categories are clean and finite, so you MAY give per-category breakdowns when asked (e.g. "how much on food this month?"). Use get_month_summary — its by_category field has the per-category totals for the month.',
    '- If a request is ambiguous (e.g. you cannot tell expense vs income, or which investment), ask one short clarifying question instead of guessing.',
    '- To settle / pay off / cancel a debt, use settle_debt (NOT delete). For a partial repayment use add_debt_payment (it auto-settles when fully paid). find_entries(kind:"debt") returns is_settled.',
    '- Investments: add_investment creates the account itself — ask which category (trading / unit_trust / savings) if unclear. add_investment_transaction logs a buy/sell/dividend on an EXISTING investment. Use find_entries(kind:"investment") to edit, delete, or archive an investment.',
    '- Liabilities are "deductions": add_deduction / update_deduction / delete_deduction / toggle_deduction, and mark_deduction_paid to mark the current month paid (default the amount to its expected_amount). find_entries(kind:"deduction").',
    '- Subscriptions: you can renew_subscription, pause/resume (toggle_subscription), or delete_subscription — but to CREATE or EDIT a subscription, tell the user to use the Subscriptions form (too many fields for chat). find_entries(kind:"subscription").',
    '- Notes: add_note / update_note / delete_note (find_entries(kind:"note")); use get_notes to read them.',
    '- Daily spending target: set_daily_target sets a new limit effective from a date. find_entries(kind:"daily_target") to delete an entry.',
    '- For any toggle_* tool, `active` is the desired END state (true = active/resumed, false = archived/paused).',
    '- Format money as RM followed by the amount (e.g. RM5.00). Keep replies short and conversational.',
  ].join('\n')
}
