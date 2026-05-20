/** Format today's date as 'yyyy-MM-dd' in the given timezone. */
export function todayInTz(tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day = parts.find(p => p.type === 'day')!.value
  return `${year}-${month}-${day}`
}

/**
 * Returns a Date at local midnight whose year/month/day matches today in the
 * given timezone. Safe to pass to date-fns (startOfMonth, subDays, etc.) when
 * only the calendar date matters.
 */
export function nowInTz(tz: string): Date {
  const [year, month, day] = todayInTz(tz).split('-').map(Number)
  return new Date(year, month - 1, day)
}
