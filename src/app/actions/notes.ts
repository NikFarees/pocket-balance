'use server'

import { createClient, getServerUser } from '@/lib/supabase/server'
import { exceedsLength, MAX_SHORT_TEXT, MAX_NOTE_BODY } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export type Note = {
  id: string
  title: string
  body: string | null
  created_at: string
  updated_at: string
}

export async function getNotesData() {
  const user = await getServerUser()
  if (!user) return null
  const supabase = await createClient()

  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return { notes: (data ?? []) as Note[] }
}

export async function addNote(formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const body = (formData.get('body') as string).trim() || null

  if (!title) return { error: 'Title is required' }
  if (exceedsLength(title, MAX_SHORT_TEXT)) return { error: 'Title is too long' }
  if (exceedsLength(body, MAX_NOTE_BODY)) return { error: 'Note is too long' }

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title,
    body,
  })

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function updateNote(id: string, formData: FormData) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const body = (formData.get('body') as string).trim() || null

  if (!title) return { error: 'Title is required' }
  if (exceedsLength(title, MAX_SHORT_TEXT)) return { error: 'Title is too long' }
  if (exceedsLength(body, MAX_NOTE_BODY)) return { error: 'Note is too long' }

  const { error } = await supabase
    .from('notes')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function deleteNote(id: string) {
  const user = await getServerUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}
