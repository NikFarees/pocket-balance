import { logout } from '@/app/actions/auth'
import { AppHeader } from '@/components/AppHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '../settings/ChangePasswordForm'
import { EditUsernameForm } from './EditUsernameForm'

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
  const username = profile?.username ?? null
  const initial = (username ?? email).charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Profile</h2>

        {/* Identity card */}
        <Card>
          <CardContent className="pt-6 pb-6 flex items-center gap-4">
            <Avatar size="lg" className="size-14 text-lg">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{username ?? <span className="text-muted-foreground italic">No username</span>}</p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Edit username */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-0.5">Username</p>
          <EditUsernameForm currentUsername={username} />
        </div>

        {/* Change password */}
        <ChangePasswordForm />

        <Separator />

        {/* Sign out */}
        <form action={logout}>
          <Button type="submit" variant="destructive" className="w-full gap-2">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </main>
    </div>
  )
}
