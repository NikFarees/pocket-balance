'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const standaloneLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/debts', label: 'Debts' },
]

const financeLinks = [
  { href: '/income', label: 'Income' },
  { href: '/deductions', label: 'Deductions' },
  { href: '/settings', label: 'Daily Target' },
]

const assetLinks = [
  { href: '/investments', label: 'Investments' },
  { href: '/backup', label: 'Backup Fund' },
]

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isFinanceActive = financeLinks.some(l => pathname === l.href)
  const isAssetsActive = assetLinks.some(l => pathname === l.href)

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg shrink-0">PocketBalance</Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {standaloneLinks.map((l) => (
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

          {/* Finance dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'gap-1',
              isFinanceActive && 'bg-muted font-medium'
            )}>
              Finance <ChevronDown className="size-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {financeLinks.map((l) => (
                <DropdownMenuItem key={l.href} onClick={() => router.push(l.href)} className={cn(pathname === l.href && 'font-medium')}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assets dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'gap-1',
              isAssetsActive && 'bg-muted font-medium'
            )}>
              Assets <ChevronDown className="size-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {assetLinks.map((l) => (
                <DropdownMenuItem key={l.href} onClick={() => router.push(l.href)} className={cn(pathname === l.href && 'font-medium')}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/profile" className="hidden md:flex">
            <Avatar size="sm" className="cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </AvatarFallback>
            </Avatar>
          </Link>
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden px-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 flex flex-col gap-1">
          {standaloneLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'justify-start w-full',
                pathname === l.href && 'bg-muted font-medium'
              )}
            >
              {l.label}
            </Link>
          ))}

          {/* Finance group */}
          <button
            onClick={() => setFinanceOpen(!financeOpen)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'justify-between w-full',
              isFinanceActive && 'bg-muted font-medium'
            )}
          >
            Finance <ChevronDown className={cn('size-3 opacity-60 transition-transform', financeOpen && 'rotate-180')} />
          </button>
          {financeOpen && (
            <div className="pl-4 flex flex-col gap-1">
              {financeLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start w-full',
                    pathname === l.href && 'bg-muted font-medium'
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Assets group */}
          <button
            onClick={() => setAssetsOpen(!assetsOpen)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'justify-between w-full',
              isAssetsActive && 'bg-muted font-medium'
            )}
          >
            Assets <ChevronDown className={cn('size-3 opacity-60 transition-transform', assetsOpen && 'rotate-180')} />
          </button>
          {assetsOpen && (
            <div className="pl-4 flex flex-col gap-1">
              {assetLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'justify-start w-full',
                    pathname === l.href && 'bg-muted font-medium'
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'justify-start w-full',
              pathname === '/profile' && 'bg-muted font-medium'
            )}
          >
            Profile
          </Link>
        </div>
      )}
    </header>
  )
}
