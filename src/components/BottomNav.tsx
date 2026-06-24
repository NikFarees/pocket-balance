'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, BarChart2, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    isActive: (pathname: string) => pathname === '/',
  },
  {
    label: 'Insights',
    icon: BarChart2,
    href: '/insights',
    isActive: (pathname: string) => pathname.startsWith('/insights'),
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
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {/* Dashboard, Expenses */}
        {tabs.slice(0, 2).map(({ label, icon: Icon, href, isActive }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2',
              isActive(pathname) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="size-5" />
            <span className="text-[10px] mt-0.5">{label}</span>
          </Link>
        ))}

        {/* AI tab — center */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-assistant'))}
          aria-label="Open AI assistant"
          className="flex-1 flex flex-col items-center justify-center py-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="size-5" />
          <span className="text-[10px] mt-0.5">AI</span>
        </button>

        {/* Insights, Notes */}
        {tabs.slice(2).map(({ label, icon: Icon, href, isActive }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2',
              isActive(pathname) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="size-5" />
            <span className="text-[10px] mt-0.5">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
