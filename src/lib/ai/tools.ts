import type Anthropic from '@anthropic-ai/sdk'

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
])

export const READ_TOOL_NAMES = new Set([
  'get_today_status',
  'get_month_summary',
  'get_backup_balance',
  'get_debts_summary',
  'find_entries',
])

export const TOOLS: Anthropic.Tool[] = [
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
        category: { type: 'string', description: 'Optional free-text category, e.g. "Food", "Transport".' },
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
        category: { type: 'string', description: 'Optional free-text category.' },
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
      'Get a summary of a month: total income, total expenses, total recurring deductions, and the resulting net. Call this to answer questions like "how much did I spend this month?" or "where is my money going?".',
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
    name: 'find_entries',
    description:
      "Look up the user's recent entries (with their database IDs) so you can edit or delete a specific one. ALWAYS call this before any update_* or delete_* tool, and use only the IDs it returns. Optionally narrow with `date` (a single day) or `contains` (a text fragment matching the description / person / investment name).",
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['expense', 'income', 'debt', 'backup', 'investment_transaction'],
          description: 'Which kind of entry to look up.',
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
    '- When the user states an amount and a purpose (e.g. "RM5 for lunch"), call add_expense. Infer a sensible category when obvious (food, transport, groceries, etc.), but leave it out if unsure.',
    '- The expense `category` is free text and inconsistent (e.g. "drink" vs "drinks"), so do NOT give per-category breakdowns in summaries — report totals and net instead, unless the user explicitly asks about a specific category.',
    '- If a request is ambiguous (e.g. you cannot tell expense vs income, or which investment), ask one short clarifying question instead of guessing.',
    '- Format money as RM followed by the amount (e.g. RM5.00). Keep replies short and conversational.',
  ].join('\n')
}
