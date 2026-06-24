import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in or sign up',
  description:
    'Log in to PennyWise or create a free account to track your daily finances in Ringgit (RM).',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      {children}
    </main>
  )
}
