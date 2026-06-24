import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const FEATURES: { title: string; body: string }[] = [
  {
    title: 'Daily budget with carry-forward',
    body: 'Set a daily spending limit. PennyWise tracks what you spend each day and carries any overspend forward, so your running balance always reflects reality.',
  },
  {
    title: 'Income & Malaysian statutory deductions',
    body: 'Log salary and side income. For salaried entries it auto-calculates EPF, SOCSO, EIS and lets you enter PCB tax, storing your true net take-home.',
  },
  {
    title: 'Recurring bills & subscriptions',
    body: 'Track recurring deductions and subscriptions, mark them paid each month, and see what is still outstanding at a glance.',
  },
  {
    title: 'Debts you owe and are owed',
    body: 'Keep both sides of every debt in one place and mark them settled when the money moves.',
  },
  {
    title: 'Investments & backup fund',
    body: 'Record trading, unit trust (ASNB) and savings (Tabung Haji) transactions, plus an emergency backup fund with deposits and withdrawals.',
  },
  {
    title: 'AI assistant (voice & text)',
    body: 'Log expenses and ask questions about your finances in plain language — by typing or speaking. It proposes each entry and you confirm before anything is saved.',
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is PennyWise?',
    a: 'PennyWise is a free personal daily finance tracker for Malaysia. It tracks income, recurring bills, daily expenses, debts, investments and an emergency fund, with a running daily balance and carry-forward overspend logic. All amounts are in Malaysian Ringgit (RM).',
  },
  {
    q: 'Is PennyWise free?',
    a: 'Yes. PennyWise is free to use. Create an account with your email and start tracking immediately.',
  },
  {
    q: 'How does the daily budget and carry-forward work?',
    a: 'You set a daily spending limit. Each day PennyWise compares what you spent against that limit; any overspend is carried forward to the next day, so your effective budget always reflects your real position rather than resetting blindly.',
  },
  {
    q: 'Does PennyWise calculate EPF, SOCSO and EIS?',
    a: 'Yes. When you enter a salary with a gross amount, PennyWise automatically calculates EPF, SOCSO and EIS contributions and lets you enter PCB tax, then stores your net take-home pay.',
  },
  {
    q: 'Can I track investments like ASNB, gold or Tabung Haji?',
    a: 'Yes. PennyWise supports trading accounts (buy/sell with quantity and price), unit trusts such as ASNB (save/redeem/dividend), and savings such as Tabung Haji (deposit/withdraw/dividend).',
  },
  {
    q: 'Is my financial data private and secure?',
    a: 'Yes. Every record is protected by row-level security tied to your account, so only you can read your data. PennyWise also supports two-factor authentication (TOTP) for extra protection.',
  },
  {
    q: 'Can I use voice to log expenses?',
    a: 'Yes. The built-in AI assistant accepts voice or text. Say or type something like "RM12 for lunch" and it proposes the entry for you to confirm before saving.',
  },
]

function jsonLd() {
  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'PennyWise',
    description:
      'Free personal daily finance tracker for Malaysia: income, EPF/SOCSO/EIS, bills, daily budget with carry-forward, debts, investments and an emergency fund — all in Ringgit (RM).',
    url: SITE_URL,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'MYR' },
  }
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PennyWise',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
  return [webApp, org, faq]
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD structured data for search + answer engines */}
      {jsonLd().map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Top bar */}
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading font-semibold text-lg text-primary tracking-tight">
          <Logo className="size-7" />
          PennyWise
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            Get started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-16 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Daily personal finance tracker for Malaysia
          </h1>
          <p className="mt-5 text-lg text-muted-foreground text-balance">
            PennyWise tracks your income, bills, daily spending, debts, investments and emergency
            fund — with a running daily budget in Ringgit (RM) and an AI assistant that logs
            entries from your voice or text.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
              Start tracking — it&apos;s free
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Log in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-center">
            Everything you need to manage your money
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, body }) => (
              <article key={title} className="rounded-xl border bg-card p-5">
                <h3 className="font-heading font-semibold text-base">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-center">
            Frequently asked questions
          </h2>
          <dl className="mt-10 space-y-6">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-xl border bg-card p-5">
                <dt className="font-heading font-semibold">{q}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing CTA */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-balance">
            Take control of your daily spending
          </h2>
          <p className="mt-3 text-muted-foreground">Free, private, and built for Malaysian finances.</p>
          <div className="mt-7">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="size-5" />
            <span>PennyWise — personal finance for Malaysia</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
