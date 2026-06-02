import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error') ?? searchParams.get('error_code')
  const raw = searchParams.get('next') ?? '/'
  const next = raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/'

  if (error) {
    const redirectUrl = new URL(next, origin)
    redirectUrl.searchParams.set('error', 'The password reset link is invalid or expired.')
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      const redirectUrl = new URL(next, origin)
      redirectUrl.searchParams.set('error', 'The password reset link is invalid or expired.')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
