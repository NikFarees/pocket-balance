'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  BetweenHorizontalEnd, BetweenVerticalEnd, Bold, Columns3, Heading1, Heading2,
  Heading3, Italic, List, ListOrdered, Quote, Rows3, Strikethrough,
  Table as TableIcon, Trash2, Underline as UnderlineIcon,
} from 'lucide-react'

export function NoteToolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'),
      inTable: editor.isActive('table'),
    }),
  })

  const cls = (active: boolean) => cn('h-8 w-8 p-0', active && 'bg-muted text-foreground')

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <Button type="button" variant="ghost" size="sm" className={cls(s.h1)} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Heading 1"><Heading1 className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.h2)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2"><Heading2 className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.h3)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3"><Heading3 className="size-4" /></Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" className={cls(s.bold)} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.italic)} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.underline)} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline"><UnderlineIcon className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.strike)} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Strikethrough"><Strikethrough className="size-4" /></Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" className={cls(s.bullet)} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.ordered)} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list"><ListOrdered className="size-4" /></Button>
      <Button type="button" variant="ghost" size="sm" className={cls(s.quote)} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote"><Quote className="size-4" /></Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} aria-label="Insert table" title="Insert table"><TableIcon className="size-4" /></Button>
      {s.inTable && (
        <>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().addColumnAfter().run()} aria-label="Add column" title="Add column"><BetweenVerticalEnd className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().deleteColumn().run()} aria-label="Delete column" title="Delete column"><Columns3 className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().addRowAfter().run()} aria-label="Add row" title="Add row"><BetweenHorizontalEnd className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().deleteRow().run()} aria-label="Delete row" title="Delete row"><Rows3 className="size-4" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().deleteTable().run()} aria-label="Delete table" title="Delete table"><Trash2 className="size-4" /></Button>
        </>
      )}
    </div>
  )
}
