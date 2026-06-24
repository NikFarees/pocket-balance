export const EXPENSE_CATEGORIES = [
  'Food & Drinks',
  'Transport',
  'Shopping',
  'Health',
  'Other',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export const MAX_SHORT_TEXT = 200
export const MAX_LONG_TEXT = 1000
export const MAX_NOTE_BODY = 20000

/** Returns true if the trimmed string exceeds max length. */
export function exceedsLength(value: string | null | undefined, max: number): boolean {
  return !!value && value.trim().length > max
}
