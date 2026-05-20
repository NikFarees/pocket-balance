'use client'

import { logout } from '@/app/actions/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/salary', label: 'Salary' },
  { href: '/deductions', label: 'Deductions' },
  { href: '/investments', label: 'Investments' },
  { href: '/backup', label: 'Backup Fund' },
  { href: '/settings', label: 'Daily Target' },
]

export function AppHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg shrink-0">PocketBalance</Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                pathname === l.href && 'bg-muted font-medium'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={logout} className="hidden md:block">
            <Button variant="ghost" size="sm" type="submit">Sign out</Button>
          </form>
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden px-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-background px-4 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'justify-start w-full',
                pathname === l.href && 'bg-muted font-medium'
              )}
            >
              {l.label}
            </Link>
          ))}
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="justify-start w-full">
              Sign out
            </Button>
          </form>
        </div>
      )}
    </header>
  )
}
