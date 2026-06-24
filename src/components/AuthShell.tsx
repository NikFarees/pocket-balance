import { getServerUser } from "@/lib/supabase/server"
import { AssistantWidget } from "@/components/assistant/AssistantWidget"
import { BottomNav } from "@/components/BottomNav"

export async function AuthShell() {
  const user = await getServerUser()
  if (!user) return null
  return (
    <>
      <BottomNav />
      <AssistantWidget />
    </>
  )
}
