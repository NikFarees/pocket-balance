/**
 * Per-request Content-Security-Policy.
 *
 * Inline scripts must carry a fresh per-request nonce instead of relying on
 * 'unsafe-inline'. Next.js reads the nonce from the request's CSP header and
 * stamps it on its inline bootstrap/RSC scripts; next-themes gets it via the
 * root layout. External scripts are limited to our own origin ('self') and the
 * Cloudflare Turnstile host. 'unsafe-eval' is only added in dev, where React
 * needs it for debugging features.
 *
 * 'strict-dynamic' is deliberately NOT used: Next.js 16.2 emits the chunks for
 * loading/error boundaries as <script async> tags without a nonce, and
 * 'strict-dynamic' disables the 'self' allowlist, so those chunks would be
 * blocked.
 *
 * Styles keep 'unsafe-inline': React style props, next/font and sonner inject
 * inline styles, and inline CSS cannot execute code.
 */
export function generateNonce(): string {
  return btoa(crypto.randomUUID())
}

export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseOrigin = ''
  if (supabaseUrl) {
    try {
      supabaseOrigin = new URL(supabaseUrl).origin
    } catch {
      supabaseOrigin = ''
    }
  }
  const supabaseWs = supabaseOrigin.replace(/^http/, 'ws')

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      'https://challenges.cloudflare.com',
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", supabaseOrigin, supabaseWs].filter(Boolean),
    'frame-src': ['https://challenges.cloudflare.com'],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')

  return isDev ? policy : `${policy}; upgrade-insecure-requests`
}
