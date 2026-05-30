import { format } from 'date-fns'
import { addExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import { createIncome, updateIncome, deleteIncome } from '@/app/actions/income'
import { createDebt, updateDebt, deleteDebt } from '@/app/actions/debts'
import { addBackupTransaction, updateBackupTransaction, deleteBackupTransaction } from '@/app/actions/backup'
import { addTransaction, getInvestments, updateTransaction, deleteTransaction } from '@/app/actions/investments'

export type Proposal = { action: string; params: Record<string, unknown> }

export type ProposalKind = 'create' | 'update' | 'delete'

type ActionResult = { success?: boolean; error?: string }

/** Operation class of a proposal, derived from its action name prefix. */
export function proposalKind(action: string): ProposalKind {
  if (action.startsWith('delete_')) return 'delete'
  if (action.startsWith('update_')) return 'update'
  return 'create'
}

const str = (v: unknown) => (v == null ? '' : String(v))
const num = (v: unknown) => (v == null ? '' : String(v))

/**
 * Maps a confirmed assistant proposal to the matching existing server action,
 * reusing all of their validation, RLS, and revalidatePath behaviour. The
 * assistant never writes to the DB itself — this runs only after the user
 * clicks Confirm.
 */
export async function executeProposal({ action, params }: Proposal): Promise<ActionResult> {
  const today = format(new Date(), 'yyyy-MM-dd') // device-local today
  const fd = new FormData()

  switch (action) {
    case 'add_expense':
      fd.set('amount', num(params.amount))
      fd.set('description', str(params.description))
      fd.set('category', str(params.category))
      fd.set('expense_date', str(params.expense_date) || today)
      return addExpense(fd)

    case 'add_income':
      fd.set('source', str(params.source))
      fd.set('amount', num(params.amount))
      fd.set('income_date', str(params.income_date) || today)
      fd.set('notes', str(params.notes))
      return createIncome(fd)

    case 'add_debt':
      fd.set('type', str(params.type))
      fd.set('person_name', str(params.person_name))
      fd.set('amount', num(params.amount))
      fd.set('description', str(params.description))
      fd.set('due_date', str(params.due_date))
      fd.set('notes', str(params.notes))
      return createDebt(fd)

    case 'add_backup_transaction':
      fd.set('type', str(params.type))
      fd.set('amount', num(params.amount))
      fd.set('description', str(params.description))
      fd.set('location', str(params.location))
      fd.set('transaction_date', str(params.transaction_date) || today)
      return addBackupTransaction(fd)

    case 'add_investment_transaction': {
      const wanted = str(params.investment_name).trim().toLowerCase()
      if (!wanted) return { error: 'Which investment is this for?' }
      const investments = await getInvestments()
      const matches = investments.filter(
        inv => inv.name.toLowerCase() === wanted || inv.name.toLowerCase().includes(wanted)
      )
      if (matches.length === 0) return { error: `No investment named "${str(params.investment_name)}" found. Create it first on the Investments page.` }
      if (matches.length > 1) return { error: `Multiple investments match "${str(params.investment_name)}". Please be more specific.` }

      fd.set('type', str(params.type))
      fd.set('amount', num(params.amount))
      fd.set('quantity', num(params.quantity))
      fd.set('price_per_unit', num(params.price_per_unit))
      fd.set('transaction_date', str(params.transaction_date) || today)
      fd.set('notes', str(params.notes))
      return addTransaction(matches[0].id, fd)
    }

    // ---- UPDATE ----
    case 'update_expense': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to update.' }
      fd.set('amount', num(params.amount))
      fd.set('description', str(params.description))
      fd.set('category', str(params.category))
      return updateExpense(id, fd)
    }

    case 'update_income': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to update.' }
      fd.set('source', str(params.source))
      fd.set('amount', num(params.amount))
      fd.set('income_date', str(params.income_date) || today)
      fd.set('notes', str(params.notes))
      return updateIncome(id, fd)
    }

    case 'update_debt': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to update.' }
      fd.set('person_name', str(params.person_name))
      fd.set('amount', num(params.amount))
      fd.set('description', str(params.description))
      fd.set('due_date', str(params.due_date))
      return updateDebt(id, fd)
    }

    case 'update_backup_transaction': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to update.' }
      fd.set('type', str(params.type))
      fd.set('amount', num(params.amount))
      fd.set('description', str(params.description))
      fd.set('location', str(params.location))
      fd.set('transaction_date', str(params.transaction_date) || today)
      return updateBackupTransaction(id, fd)
    }

    case 'update_investment_transaction': {
      const id = str(params.id)
      const investmentId = str(params.investment_id)
      if (!id || !investmentId) return { error: 'Missing transaction to update.' }
      fd.set('type', str(params.type))
      fd.set('amount', num(params.amount))
      fd.set('quantity', num(params.quantity))
      fd.set('price_per_unit', num(params.price_per_unit))
      fd.set('transaction_date', str(params.transaction_date) || today)
      fd.set('notes', str(params.notes))
      return updateTransaction(id, investmentId, fd)
    }

    // ---- DELETE ----
    case 'delete_expense': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to delete.' }
      return deleteExpense(id)
    }

    case 'delete_income': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to delete.' }
      return deleteIncome(id)
    }

    case 'delete_debt': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to delete.' }
      return deleteDebt(id)
    }

    case 'delete_backup_transaction': {
      const id = str(params.id)
      if (!id) return { error: 'Missing entry to delete.' }
      return deleteBackupTransaction(id)
    }

    case 'delete_investment_transaction': {
      const id = str(params.id)
      const investmentId = str(params.investment_id)
      if (!id || !investmentId) return { error: 'Missing transaction to delete.' }
      return deleteTransaction(id, investmentId)
    }

    default:
      return { error: 'Unknown action' }
  }
}

/** Human-readable summary of a proposal for the confirmation card. */
export function describeProposal({ action, params }: Proposal): string {
  const rm = (v: unknown) => `RM${Number(v ?? 0).toFixed(2)}`
  const when = (v: unknown) => (v ? String(v) : 'today')
  switch (action) {
    case 'add_expense':
      return `Add expense ${rm(params.amount)} — ${str(params.description) || 'expense'}${params.category ? ` (${str(params.category)})` : ''}, ${when(params.expense_date)}`
    case 'add_income':
      return `Add income ${rm(params.amount)} from ${str(params.source) || 'income'}, ${when(params.income_date)}`
    case 'add_debt':
      return params.type === 'they_owe'
        ? `${str(params.person_name)} owes you ${rm(params.amount)}`
        : `You owe ${str(params.person_name)} ${rm(params.amount)}`
    case 'add_backup_transaction':
      return `${params.type === 'withdrawal' ? 'Withdraw' : 'Deposit'} ${rm(params.amount)} ${params.type === 'withdrawal' ? 'from' : 'to'} backup fund, ${when(params.transaction_date)}`
    case 'add_investment_transaction':
      return `${capitalize(str(params.type))} ${rm(params.amount)} — ${str(params.investment_name)}, ${when(params.transaction_date)}`

    case 'update_expense':
      return `Update expense → ${rm(params.amount)} — ${str(params.description) || 'expense'}${params.category ? ` (${str(params.category)})` : ''}`
    case 'update_income':
      return `Update income → ${rm(params.amount)} from ${str(params.source) || 'income'}`
    case 'update_debt':
      return `Update debt → ${str(params.person_name)}: ${rm(params.amount)}`
    case 'update_backup_transaction':
      return `Update backup → ${capitalize(str(params.type))} ${rm(params.amount)}`
    case 'update_investment_transaction':
      return `Update investment txn → ${capitalize(str(params.type))} ${rm(params.amount)}`

    case 'delete_expense':
      return `Delete expense: ${str(params.summary) || 'this expense'}`
    case 'delete_income':
      return `Delete income: ${str(params.summary) || 'this income'}`
    case 'delete_debt':
      return `Delete debt: ${str(params.summary) || 'this debt'}`
    case 'delete_backup_transaction':
      return `Delete backup transaction: ${str(params.summary) || 'this transaction'}`
    case 'delete_investment_transaction':
      return `Delete investment transaction: ${str(params.summary) || 'this transaction'}`

    default:
      return 'Confirm this action?'
  }
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
