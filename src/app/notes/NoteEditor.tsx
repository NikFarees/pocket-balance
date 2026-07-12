'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { NoteToolbar } from './NoteToolbar'
import { useTableColumnTouchResize } from './useTableColumnTouchResize'

export function NoteEditor({
  defaultHtml = '',
  onChange,
}: {
  defaultHtml?: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit, TableKit.configure({ table: { resizable: true } })],
    content: defaultHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  useTableColumnTouchResize(editor)

  if (!editor) return null

  return (
    <div className="rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50">
      <NoteToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
