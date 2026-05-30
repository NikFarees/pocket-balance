'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Loader2, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

type VerifiedFactor = { id: string; friendlyName: string }

type Enrollment = { factorId: string; qrCode: string; secret: string }

export function MfaSetup() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [factor, setFactor] = useState<VerifiedFactor | null>(null)

  const [enrolling, setEnrolling] = useState(false)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const verified = data.totp.find(f => f.status === 'verified')
    setFactor(
      verified ? { id: verified.id, friendlyName: verified.friendly_name ?? 'Authenticator' } : null
    )
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // `loading` already starts true; refresh sets it false once factors load.
    // Wrapped so the setState calls happen asynchronously, not in the effect body.
    void (async () => {
      await refresh()
    })()
  }, [refresh])

  async function startEnroll() {
    setEnrolling(true)
    // Clear any unverified factor left over from an abandoned enrollment, so
    // `enroll` does not error with "factor already exists". (`data.all` includes
    // unverified factors; `data.totp` is narrowed to verified ones only.)
    const { data: list } = await supabase.auth.mfa.listFactors()
    const stale = list?.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified') ?? []
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator',
    })
    if (error || !data) {
      toast.error(error?.message ?? 'Could not start two-factor setup')
      setEnrolling(false)
      return
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    setCode('')
    setEnrolling(false)
  }

  async function cancelEnroll() {
    if (enrollment) {
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId })
    }
    setEnrollment(null)
    setCode('')
  }

  async function verifyEnroll() {
    if (!enrollment) return
    setVerifying(true)
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: enrollment.factorId,
    })
    if (chErr || !ch) {
      toast.error(chErr?.message ?? 'Could not start verification')
      setVerifying(false)
      return
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: ch.id,
      code: code.trim(),
    })
    if (error) {
      toast.error(error.message)
      setVerifying(false)
      return
    }
    toast.success('Two-factor authentication enabled')
    setEnrollment(null)
    setCode('')
    setVerifying(false)
    await refresh()
  }

  async function copySecret() {
    if (!enrollment) return
    try {
      await navigator.clipboard.writeText(enrollment.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy')
    }
  }

  async function remove() {
    if (!factor) return
    setRemoving(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) {
      toast.error(error.message)
      setRemoving(false)
      return
    }
    toast.success('Two-factor authentication removed')
    setConfirmRemove(false)
    setRemoving(false)
    await refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading two-factor settings…
      </div>
    )
  }

  // Verified factor exists — show status + remove.
  if (factor) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span>Two-factor authentication is on</span>
          <span className="text-muted-foreground">({factor.friendlyName})</span>
        </div>
        {confirmRemove ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Remove two-factor authentication? You will sign in with just your password.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" disabled={removing} onClick={remove}>
                {removing ? <><Loader2 className="mr-2 size-4 animate-spin" />Removing…</> : 'Confirm remove'}
              </Button>
              <Button variant="outline" size="sm" disabled={removing} onClick={() => setConfirmRemove(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmRemove(true)}>
            Remove
          </Button>
        )}
      </div>
    )
  }

  // Active enrollment flow — show QR + secret + code input.
  if (enrollment) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Set up your authenticator app</p>
          <Button variant="ghost" size="icon" onClick={cancelEnroll} aria-label="Cancel">
            <X className="size-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enrollment.qrCode}
          alt="Two-factor QR code"
          className="size-44 rounded-md border bg-white p-2"
        />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Or enter this code manually</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs break-all font-mono">
              {enrollment.secret}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={copySecret} aria-label="Copy secret">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            verifyEnroll()
          }}
          className="space-y-2"
        >
          <Label htmlFor="mfa-enroll-code">Verification code</Label>
          <Input
            id="mfa-enroll-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <Button type="submit" disabled={verifying || code.length !== 6} className="w-full">
            {verifying ? <><Loader2 className="mr-2 size-4 animate-spin" />Verifying…</> : 'Verify & enable'}
          </Button>
        </form>
      </div>
    )
  }

  // No factor — offer to enable.
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add an extra layer of security by requiring a code from your authenticator app at sign-in.
      </p>
      <Button variant="outline" onClick={startEnroll} disabled={enrolling} className="w-full">
        {enrolling ? (
          <><Loader2 className="mr-2 size-4 animate-spin" />Starting…</>
        ) : (
          <><ShieldCheck className="mr-2 size-4" />Enable two-factor authentication</>
        )}
      </Button>
    </div>
  )
}
