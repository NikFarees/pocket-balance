import { cn } from '@/lib/utils'

/** PennyWise PW monogram mark. Brand-green rounded tile with a cream P+W. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn('size-7 shrink-0', className)}
      role="img"
      aria-label="PennyWise"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="512" height="512" rx="114" fill="#2f7d54" />
      <g
        fill="none"
        stroke="#f5f1e6"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M158 132 V300" />
        <path d="M158 132 H252 C306 132 306 232 252 232 H158" />
        <path d="M150 300 L196 388 L256 312 L316 388 L362 300" />
      </g>
    </svg>
  )
}
