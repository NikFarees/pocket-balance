'use client'

import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
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
              We sent a confirmation link to your email address. Click it to activate your account.
            </p>
            <p className="text-xs text-muted-foreground pt-3">
              Already confirmed?{' '}
              <Link href="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription>Sign up to start tracking your finances</CardDescription>
          </CardHeader>

          <form action={handleSubmit}>
            <CardContent className="space-y-5 px-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="new-password" minLength={6} />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" required autoComplete="new-password" />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-5 px-6 pt-2 pb-6">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
