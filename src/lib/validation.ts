export const MAX_SHORT_TEXT = 200
export const MAX_LONG_TEXT = 1000

/** Returns true if the trimmed string exceeds max length. */
export function exceedsLength(value: string | null | undefined, max: number): boolean {
  return !!value && value.trim().length > max
}
