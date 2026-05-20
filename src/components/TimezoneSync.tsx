'use client'

import { useEffect } from 'react'

export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; SameSite=Lax; max-age=86400`
  }, [])
  return null
}
