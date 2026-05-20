import { cookies } from 'next/headers'
import { nowInTz, todayInTz } from './date'

async function getDeviceTz(): Promise<string> {
  const store = await cookies()
  const raw = store.get('tz')?.value
  if (raw) return decodeURIComponent(raw)
  // Fallback: server's own system timezone (correct on local dev; on cloud set TZ env var if needed)
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Today's date string ('yyyy-MM-dd') in the user's device timezone. */
export async function serverToday(): Promise<string> {
  return todayInTz(await getDeviceTz())
}

/**
 * A Date at local midnight whose calendar date matches today in the user's
 * device timezone. Use as a drop-in for new Date() with date-fns functions.
 */
export async function serverNow(): Promise<Date> {
  return nowInTz(await getDeviceTz())
}
