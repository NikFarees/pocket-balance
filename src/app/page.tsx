import { getServerUser } from '@/lib/supabase/server'
import { DashboardHome } from '@/components/dashboard/DashboardHome'
import { Landing } from '@/components/landing/Landing'

export default async function HomePage() {
  const user = await getServerUser()
  if (!user) return <Landing />
  return <DashboardHome />
}
