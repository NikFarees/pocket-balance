'use client'

import { Toggle } from '@/components/ui/toggle'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="size-8" />

  const isDark = resolvedTheme === 'dark'

  return (
    <Toggle
      pressed={isDark}
      onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
      aria-label="Toggle dark mode"
      size="sm"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Toggle>
  )
}
