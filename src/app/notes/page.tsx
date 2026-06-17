import { getNotesData } from '@/app/actions/notes'
import { AppHeader } from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoteForm } from './NoteForm'
import { NoteList } from './NoteList'

export default async function NotesPage() {
  const data = await getNotesData()
  if (!data) return null

  const { notes } = data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Notes</h2>

        <NoteForm />

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Your Notes</span>
              <span className="text-sm font-normal text-muted-foreground">{notes.length} notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <NoteList notes={notes} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
