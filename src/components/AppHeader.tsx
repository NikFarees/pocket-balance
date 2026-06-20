'use client'

import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { ChevronDown, Menu, Wallet, CreditCard, FileText, RefreshCw, Target, Shield, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const standaloneLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/debts', label: 'Debts' },
  { href: '/notes', label: 'Notes' },
]

const financeLinks = [
  { href: '/income', label: 'Income' },
  { href: '/deductions', label: 'Liabilities' },
  { href: '/subscriptions', label: 'Subscriptions' },
  { href: '/settings', label: 'Daily Target' },
]

const assetLinks = [
  { href: '/investments', label: 'Investments' },
  { href: '/backup', label: 'Backup Fund' },
]

const drawerGroups = [
  {
    label: 'Track',
    links: [
      { label: 'Income', href: '/income', icon: Wallet },
      { label: 'Debts', href: '/debts', icon: CreditCard },
    ],
  },
  {
    label: 'Plan',
    links: [
      { label: 'Liabilities', href: '/deductions', icon: FileText },
      { label: 'Subscriptions', href: '/subscriptions', icon: RefreshCw },
      { label: 'Daily Target', href: '/settings', icon: Target },
    ],
  },
  {
    label: 'Save',
    links: [
      { label: 'Backup Fund', href: '/backup', icon: Shield },
    ],
  },
  {
    label: 'You',
    links: [
      { label: 'Profile', href: '/profile', icon: UserCircle },
    ],
  },
]

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isFinanceActive = financeLinks.some(l => pathname === l.href)
  const isAssetsActive = assetLinks.some(l => pathname === l.href)

  return (
    <>
    <header className="sticky top-0 z-40">
      <div className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <div className="border-b bg-background/95 backdrop-blur-sm dark:bg-background/80 dark:backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" className="font-heading font-semibold text-lg text-primary tracking-tight">PennyWise</Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {standaloneLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                pathname === l.href && 'bg-primary/10 text-primary font-medium'
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
              isFinanceActive && 'bg-primary/10 text-primary font-medium'
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
              isAssetsActive && 'bg-primary/10 text-primary font-medium'
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
        </div>
      </div>
      </div>

    </header>

    {/* Mobile side drawer */}
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="left" className="!w-72 p-0 md:hidden">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="font-heading text-primary">PennyWise</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col py-2">
          {drawerGroups.map(({ label, links }) => (
            <div key={label}>
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              {links.map(({ label: linkLabel, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors',
                    pathname === href && 'text-primary font-medium bg-primary/8'
                  )}
                >
                  <Icon className="size-4" />
                  {linkLabel}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
    </>
  )
}
