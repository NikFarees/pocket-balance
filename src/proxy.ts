import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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

  // No session: only public auth routes and the MFA page are permitted. (A user
  // with no session on /mfa is sent to /login, which is correct.)
  if (!user && !isAuthRoute && !isMfaRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
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
    return NextResponse.redirect(url)
  }

  // Fully authenticated (no pending MFA): keep them out of sign-in flows and
  // /mfa, but always allow callbacks to exchange auth codes.
  const isRedirectableAuthPage = isPublicAuthRoute && !isCallbackRoute
  if (user && !needsMfa && (isRedirectableAuthPage || isMfaRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
