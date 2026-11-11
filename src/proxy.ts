import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildCsp, generateNonce } from '@/lib/csp'

export async function proxy(request: NextRequest) {
  // A fresh nonce per request. It is forwarded on the request headers (Next.js
  // reads it to nonce its own scripts; the root layout reads `x-nonce`) and set
  // as the response CSP.
  const nonce = generateNonce()
  const csp = buildCsp(nonce)

  // Builds the pass-through response from the *current* request headers, so any
  // cookies Supabase refreshed via `request.cookies.set` are carried along.
  const forward = () => {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', csp)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const withCsp = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  let supabaseResponse = forward()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = forward()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // Public, unauthenticated routes. `/auth/` covers the email-confirmation callback.
  const isPasswordResetRoute = pathname === '/reset-password'
  const isCallbackRoute = pathname.startsWith('/auth/')
  const isPublicAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    isCallbackRoute
  const isAuthRoute = isPublicAuthRoute || isPasswordResetRoute
  // `/mfa` requires a user but is the step-up page, so it is allowed without aal2.
  const isMfaRoute = pathname === '/mfa'
  // `/` serves the public marketing landing to logged-out visitors (and crawlers);
  // logged-in users get the dashboard from the same route.
  const isPublicMarketing = pathname === '/'

  // No session: only public auth routes, the MFA page, and the public landing are
  // permitted. (A user with no session on /mfa is sent to /login, which is correct.)
  if (!user && !isAuthRoute && !isMfaRoute && !isPublicMarketing) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withCsp(NextResponse.redirect(url))
  }

  // Determine whether the signed-in user still has an outstanding MFA challenge.
  let needsMfa = false
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    needsMfa = aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2'
  }

  // Pending MFA: force the user to /mfa (but allow /auth/ callbacks through, and
  // never redirect when already on /mfa — that would loop).
  if (needsMfa && !isMfaRoute && !pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/mfa'
    return withCsp(NextResponse.redirect(url))
  }

  // Fully authenticated (no pending MFA): keep them out of sign-in flows and
  // /mfa, but always allow callbacks to exchange auth codes.
  const isRedirectableAuthPage = isPublicAuthRoute && !isCallbackRoute
  if (user && !needsMfa && (isRedirectableAuthPage || isMfaRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return withCsp(NextResponse.redirect(url))
  }

  return withCsp(supabaseResponse)
}

export const config = {
  matcher: [
    // Exclude Next internals, image assets, and public SEO files (robots, sitemap,
    // manifest, llms.txt) so crawlers can fetch them without an auth redirect.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|ico)$).*)',
  ],
}
