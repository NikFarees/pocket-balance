'use client'

import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await forgotPassword(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">PocketBalance</h1>
        <p className="text-sm text-muted-foreground mt-2">Your daily financial tracker</p>
      </div>

      {success ? (
        <Card>
          <CardContent className="px-6 pt-8 pb-8 text-center space-y-3">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-lg font-semibold">Check your email</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a password reset link to your email. Click the link to set a new password.
            </p>
            <p className="text-xs text-muted-foreground pt-3">
              <Link href="/login" className="text-foreground font-medium hover:underline">Back to sign in</Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Forgot password?</CardTitle>
            <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
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
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login" className="text-foreground font-medium hover:underline">
                  Back to sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
