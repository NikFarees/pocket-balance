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
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M168 140 H250 C300 140 300 236 250 236 H168" />
        <path d="M168 140 V312 L214 388 L256 326 L298 388 L344 312" />
      </g>
    </svg>
  )
}
