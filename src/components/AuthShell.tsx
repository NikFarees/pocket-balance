import { createClient } from "@/lib/supabase/server"
import { AssistantWidget } from "@/components/assistant/AssistantWidget"
import { BottomNav } from "@/components/BottomNav"

export async function AuthShell() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (
    <>
      <BottomNav />
      <AssistantWidget />
    </>
  )
}
