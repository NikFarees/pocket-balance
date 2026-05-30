'use server'

import { createClient } from '@/lib/supabase/server'
import { exceedsLength, MAX_SHORT_TEXT } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export async function updateUsername(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const username = (formData.get('username') as string).trim()
  if (!username) return { error: 'Username is required' }
  if (exceedsLength(username, MAX_SHORT_TEXT)) return { error: 'Username is too long' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, username, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}
