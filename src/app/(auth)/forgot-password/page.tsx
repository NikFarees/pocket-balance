'use client'

import { checkEmailExists, resetPasswordByEmail } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type Step = 'email' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const emailValue = (formData.get('email') as string).trim().toLowerCase()
    const result = await checkEmailExists(formData)
    if (result.error) {
      setError(result.error)
    } else if (result.exists) {
      setEmail(emailValue)
      setStep('reset')
    } else {
      setError('No account found with that email address.')
    }
    setLoading(false)
  }

  async function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('email', email)
    const result = await resetPasswordByEmail(formData)
    if (result.error) {
      setError(result.error)
    } else {
      setStep('done')
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">PocketBalance</h1>
        <p className="text-sm text-muted-foreground mt-2">Your daily financial tracker</p>
      </div>

      {step === 'done' ? (
        <Card>
          <CardContent className="px-6 pt-8 pb-8 text-center space-y-3">
            <p className="text-lg font-semibold">Password updated</p>
            <p className="text-sm text-muted-foreground">
              Your password has been reset. You can now sign in.
            </p>
            <Link href="/login" className="text-foreground font-medium hover:underline text-sm block pt-2">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      ) : step === 'email' ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Forgot password?</CardTitle>
            <CardDescription>Enter your email to reset your password</CardDescription>
          </CardHeader>

          <form onSubmit={handleEmailSubmit}>
            <CardContent className="space-y-5 px-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-6 px-6 pt-6 pb-8 border-0 bg-transparent">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</>
                ) : 'Continue'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login" className="text-foreground font-medium hover:underline">Back to sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Set new password</CardTitle>
            <CardDescription className="truncate">Resetting password for <span className="font-medium text-foreground">{email}</span></CardDescription>
          </CardHeader>

          <form onSubmit={handleResetSubmit}>
            <CardContent className="space-y-5 px-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNew ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-6 px-6 pt-6 pb-8 border-0 bg-transparent">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</>
                ) : 'Update Password'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(null) }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
