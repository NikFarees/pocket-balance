'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUsername(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const username = (formData.get('username') as string).trim()
  if (!username) return { error: 'Username is required' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, username, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}
