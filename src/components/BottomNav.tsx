'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  TrendingUp,
  Grid2X2,
  Wallet,
  CreditCard,
  RefreshCw,
  Target,
  Shield,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const tabs = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    isActive: (pathname: string) => pathname === '/',
  },
  {
    label: 'Expenses',
    icon: Receipt,
    href: '/expenses',
    isActive: (pathname: string) => pathname.startsWith('/expenses'),
  },
  {
    label: 'Notes',
    icon: FileText,
    href: '/notes',
    isActive: (pathname: string) => pathname.startsWith('/notes'),
  },
  {
    label: 'Investments',
    icon: TrendingUp,
    href: '/investments',
    isActive: (pathname: string) => pathname.startsWith('/investments'),
  },
];

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
];

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {tabs.map(({ label, icon: Icon, href, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] mt-0.5">{label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2',
              drawerOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Grid2X2 className="size-5" />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Left side drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="!w-72 p-0">
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
  );
}
