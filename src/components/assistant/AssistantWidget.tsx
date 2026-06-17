'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Mic, Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ASSISTANT_MODELS, DEFAULT_ASSISTANT_MODEL } from '@/lib/ai/models'
import { useSpeechRecognition } from './useSpeechRecognition'
import { describeProposal, executeProposal, proposalKind, type Proposal, type ProposalKind } from './executeProposal'

// Color-coding per operation: green = add, amber = update, red = delete.
const KIND_META: Record<ProposalKind, { label: string; badge: string; border: string }> = {
  create: { label: 'Add', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', border: 'border-l-emerald-500' },
  update: { label: 'Update', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', border: 'border-l-amber-500' },
  delete: { label: 'Delete', badge: 'bg-destructive/10 text-destructive', border: 'border-l-destructive' },
}

type ChatItem =
  | { kind: 'text'; id: string; role: 'user' | 'assistant'; text: string }
  | {
      kind: 'proposal'
      id: string
      proposal: Proposal
      assistantText: string
      status: 'pending' | 'saving' | 'done' | 'cancelled' | 'error'
      error?: string
    }

let idCounter = 0
const nextId = () => `m${++idCounter}`

const GREETING =
  "Hi! Tell me an expense, income, debt, or savings move — e.g. \"RM5 for lunch today\" — or ask things like \"how much did I spend this month?\""

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState<string>(DEFAULT_ASSISTANT_MODEL)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const { supported: micSupported, listening, toggle: toggleMic } = useSpeechRecognition(text => {
    setInput(prev => (prev ? `${prev} ${text}` : text))
    inputRef.current?.focus()
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [items, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userItem: ChatItem = { kind: 'text', id: nextId(), role: 'user', text: trimmed }
    setItems(prev => [...prev, userItem])
    setInput('')
    setLoading(true)

    // History sent to the model = all prior turns + this one. Proposals are
    // included as assistant turns describing what was done, so follow-ups like
    // "remove it" / "the dinner one" have the right context to resolve.
    const history = [...items, userItem].map(it => {
      if (it.kind === 'text') return { role: it.role, content: it.text }
      const outcome =
        it.status === 'done' ? 'Done' :
        it.status === 'cancelled' ? 'User cancelled' :
        it.status === 'error' ? 'Failed' :
        'Proposed (awaiting confirmation)'
      return { role: 'assistant' as const, content: `${outcome}: ${describeProposal(it.proposal)}` }
    })

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model }),
      })
      const data = await res.json()

      if (!res.ok) {
        // For usage-limit (429) errors show only the clean message — no raw
        // provider blob. Keep the debug tail for other errors in dev.
        const isLimit = res.status === 429
        const debugMsg =
          !isLimit && process.env.NODE_ENV !== 'production' && typeof data?.debug?.message === 'string'
            ? `\n\n[debug] ${data.debug.message}${data?.debug?.model ? ` (model: ${data.debug.model})` : ''}`
            : ''
        const errorText = `${data.error || 'Sorry, something went wrong.'}${debugMsg}`
        toast.error(data.error || 'Something went wrong')
        setItems(prev => [...prev, { kind: 'text', id: nextId(), role: 'assistant', text: errorText }])
        return
      }

      if (data.type === 'proposal') {
        setItems(prev => [
          ...prev,
          {
            kind: 'proposal',
            id: nextId(),
            proposal: { action: data.action, params: data.params },
            assistantText: data.assistantText || '',
            status: 'pending',
          },
        ])
      } else {
        setItems(prev => [...prev, { kind: 'text', id: nextId(), role: 'assistant', text: data.text || 'Could you rephrase that?' }])
      }
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function confirm(id: string) {
    const item = items.find(it => it.id === id)
    if (!item || item.kind !== 'proposal') return
    setItems(prev => prev.map(it => (it.id === id && it.kind === 'proposal' ? { ...it, status: 'saving' } : it)))

    const result = await executeProposal(item.proposal)
    if (result.error) {
      setItems(prev => prev.map(it => (it.id === id && it.kind === 'proposal' ? { ...it, status: 'error', error: result.error } : it)))
      toast.error(result.error)
    } else {
      setItems(prev => prev.map(it => (it.id === id && it.kind === 'proposal' ? { ...it, status: 'done' } : it)))
      toast.success(proposalKind(item.proposal.action) === 'delete' ? 'Deleted' : 'Saved')
      router.refresh()
    }
  }

  function cancel(id: string) {
    setItems(prev => prev.map(it => (it.id === id && it.kind === 'proposal' ? { ...it, status: 'cancelled' } : it)))
  }

  if (!open) {
    return (
      <Button
        size="icon-lg"
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-5 right-5 z-50 size-12 rounded-full shadow-lg"
      >
        <Sparkles className="size-5" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(32rem,calc(100dvh-2.5rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 text-primary" />
          Assistant
        </div>
        <div className="flex items-center gap-1">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            aria-label="AI model"
            title="AI model"
            className="max-w-[9rem] rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {ASSISTANT_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{GREETING}</p>
        )}

        {items.map(item =>
          item.kind === 'text' ? (
            <div
              key={item.id}
              className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                  item.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {item.text}
              </div>
            </div>
          ) : (() => {
            const kind = proposalKind(item.proposal.action)
            const meta = KIND_META[kind]
            return (
            <div key={item.id} className={cn('rounded-xl border border-l-4 bg-muted/40 p-3 text-sm', meta.border)}>
              <span className={cn('mb-2 inline-block rounded px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide', meta.badge)}>
                {meta.label}
              </span>
              {item.assistantText && <p className="mb-2 text-muted-foreground">{item.assistantText}</p>}
              <p className="font-medium">{describeProposal(item.proposal)}</p>

              {kind === 'delete' && item.status === 'pending' && (
                <p className="mt-2 text-xs text-destructive">This permanently deletes the entry and can’t be undone.</p>
              )}

              {item.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={kind === 'delete' ? 'destructive' : 'default'} onClick={() => confirm(item.id)}>
                    {kind === 'delete' ? 'Delete' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => cancel(item.id)}>Cancel</Button>
                </div>
              )}
              {item.status === 'saving' && (
                <p className="mt-3 flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Saving…
                </p>
              )}
              {item.status === 'done' && (
                <p className="mt-3 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" /> {kind === 'delete' ? 'Deleted' : 'Saved'}
                </p>
              )}
              {item.status === 'cancelled' && <p className="mt-3 text-muted-foreground">Cancelled</p>}
              {item.status === 'error' && (
                <div className="mt-3 space-y-2">
                  <p className="text-destructive">{item.error}</p>
                  <Button size="sm" variant="ghost" onClick={() => confirm(item.id)}>Retry</Button>
                </div>
              )}
            </div>
            )
          })()
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); send(input) }}
        className="flex items-end gap-2 border-t p-3"
      >
        {micSupported && (
          <Button
            type="button"
            variant={listening ? 'default' : 'ghost'}
            size="icon"
            onClick={toggleMic}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            className={cn(listening && 'animate-pulse')}
          >
            <Mic className="size-4" />
          </Button>
        )}
        <Textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={listening ? 'Listening…' : 'Type or speak…'}
          autoComplete="off"
          rows={1}
          className="min-h-9 max-h-32 resize-none"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
