'use client'

import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function MfaPage() {
  const supabase = createClient()

  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [preparing, setPreparing] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Issue a fresh challenge for the given factor.
  const issueChallenge = useCallback(
    async (fId: string) => {
      const { data, error: chErr } = await supabase.auth.mfa.challenge({ factorId: fId })
      if (chErr || !data) {
        setError(chErr?.message ?? 'Could not start verification')
        return false
      }
      setChallengeId(data.id)
      return true
    },
    [supabase]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors()
      if (cancelled) return
      const verified = data?.totp.find(f => f.status === 'verified')
      if (listErr || !verified) {
        // No factor to challenge — nothing to step up. Send home.
        window.location.assign('/')
        return
      }
      setFactorId(verified.id)
      await issueChallenge(verified.id)
      if (!cancelled) setPreparing(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, issueChallenge])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!factorId || !challengeId) return
    setError(null)
    setVerifying(true)
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    })
    if (verifyErr) {
      setError(verifyErr.message)
      setCode('')
      // The consumed/failed challenge is no longer usable — issue a fresh one.
      await issueChallenge(factorId)
      setVerifying(false)
      return
    }
    // Full reload so middleware picks up the elevated aal2 session.
    window.location.assign('/')
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">PennyWise</h1>
        <p className="text-sm text-muted-foreground mt-2">Your daily financial tracker</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Two-factor authentication</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-6">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                autoFocus
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                disabled={preparing}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-6 px-6 pt-6 pb-8 border-0 bg-transparent">
            <Button type="submit" className="w-full h-11" disabled={verifying || preparing || code.length !== 6}>
              {verifying ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
              ) : 'Verify'}
            </Button>
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-muted-foreground text-center hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
