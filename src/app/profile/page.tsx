import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { KeyRound, Mail, User } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '../settings/ChangePasswordForm'
import { EditUsernameForm } from './EditUsernameForm'
import { SignOutButton } from './SignOutButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single()

  const email = user.email ?? ''
  const username = profile?.username ?? (user.user_metadata?.username as string | undefined) ?? null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Account details */}
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-2 divide-y">
            <div className="flex items-center gap-3 py-3">
              <User className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-20 shrink-0">Username</span>
              <div className="flex-1 min-w-0">
                <EditUsernameForm currentUsername={username} />
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-20 shrink-0">Email</span>
              <p className="text-sm truncate flex-1">{email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <KeyRound className="size-3.5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pt-3 pb-4">
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {/* Sign out */}
        <SignOutButton />

      </main>
    </div>
  )
}
