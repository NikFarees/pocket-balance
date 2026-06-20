'use client'

import { useBalanceVisibility } from './BalanceVisibilityProvider'

interface AmountProps {
  value: number
  prefix?: string
  sign?: string
  formatter?: (n: number) => string
  className?: string
}

const defaultFormat = (n: number) =>
  Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function Amount({ value, prefix = 'RM', sign, formatter, className }: AmountProps) {
  const { hidden } = useBalanceVisibility()

  if (hidden) {
    return (
      <span className={className}>
        <span aria-hidden="true">{prefix ? `${prefix} ` : ''}••••••</span>
        <span className="sr-only">Amount hidden</span>
      </span>
    )
  }

  const autoSign = value < 0 ? '-' : ''
  const displaySign = sign !== undefined ? sign : autoSign
  const formatted = formatter ? formatter(Math.abs(value)) : defaultFormat(value)

  return (
    <span className={className}>
      {displaySign}{prefix ? `${prefix} ` : ''}{formatted}
    </span>
  )
}
