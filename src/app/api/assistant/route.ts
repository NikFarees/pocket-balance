import { GoogleGenerativeAI, type ChatSession } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverToday } from '@/lib/server-date'
import { runReadTool } from '@/lib/ai/queries'
import { TOOLS, WRITE_TOOL_NAMES, systemPrompt } from '@/lib/ai/tools'
import { checkAssistantRateLimit } from '@/lib/rate-limit'

const MODEL = process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash'
const MAX_ITERATIONS = 5
// Gemini free-tier backends intermittently return 503 "model is overloaded".
// These are transient and usually clear within a second or two, so retry a
// couple of times with a short backoff before surfacing an error to the user.
const MAX_OVERLOAD_RETRIES = 2
const OVERLOAD_RETRY_DELAY_MS = 800

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** True when an error is a transient Gemini overload/unavailable (HTTP 503). */
function isOverloadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? (err as { status?: unknown }).status
      : undefined
  return status === 503 || /503|service unavailable|overloaded|UNAVAILABLE/i.test(message)
}

/**
 * Send a message to a Gemini chat, retrying on transient 503 "overloaded"
 * errors with a short backoff. Re-throws on the final attempt or for any
 * non-overload error so the route's catch block can classify it.
 */
async function sendWithRetry(
  chat: ChatSession,
  message: Parameters<ChatSession['sendMessage']>[0]
): ReturnType<ChatSession['sendMessage']> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_OVERLOAD_RETRIES; attempt++) {
    try {
      return await chat.sendMessage(message)
    } catch (err) {
      lastErr = err
      if (!isOverloadError(err) || attempt === MAX_OVERLOAD_RETRIES) throw err
      await sleep(OVERLOAD_RETRY_DELAY_MS * (attempt + 1))
    }
  }
  throw lastErr
}

type ClientMessage = { role: 'user' | 'assistant'; content: string }

/**
 * Convert the shared Anthropic-format tool schemas (from tools.ts) to the
 * Gemini `functionDeclarations` format: rename `input_schema` → `parameters`,
 * and skip the `parameters` key entirely for no-argument tools (Gemini rejects
 * empty `properties: {}`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFunctionDeclarations(): any[] {
  return TOOLS.map(({ name, description, input_schema }) => {
    const hasParams = input_schema.properties && Object.keys(input_schema.properties).length > 0
    if (!hasParams) return { name, description }
    return {
      name,
      description,
      parameters: {
        type: 'object',
        properties: input_schema.properties,
        ...(input_schema.required ? { required: input_schema.required } : {}),
      },
    }
  })
}

type GeminiTurn = { role: 'user' | 'model'; parts: { text: string }[] }

/**
 * Gemini requires the chat history to START with a `user` turn. Our history can
 * begin with an assistant ("model") turn (e.g. after a Q&A reply or an action
 * summary), which makes startChat throw "First content should be with role
 * 'user'". Trim leading model turns and merge consecutive same-role turns so the
 * history is always valid alternating user/model starting with user.
 */
function sanitizeHistory(turns: GeminiTurn[]): GeminiTurn[] {
  let start = 0
  while (start < turns.length && turns[start].role === 'model') start++
  const merged: GeminiTurn[] = []
  for (const t of turns.slice(start)) {
    const last = merged[merged.length - 1]
    if (last && last.role === t.role) last.parts.push(...t.parts)
    else merged.push({ role: t.role, parts: [...t.parts] })
  }
  return merged
}

export async function POST(req: Request) {
  // Auth — all data access stays under the user's session / RLS.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Rate limiting — burst + daily ceilings per user (no-op if Upstash unconfigured).
  const rateLimit = await checkAssistantRateLimit(user.id)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're sending requests too quickly. Please wait a moment and try again." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    )
  }

  if (!process.env.GOOGLE_AI_STUDIO_API_KEY) {
    return NextResponse.json(
      { error: 'Assistant is not configured. Add GOOGLE_AI_STUDIO_API_KEY to .env.local.' },
      { status: 500 }
    )
  }

  let body: { messages?: ClientMessage[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const incoming = (body.messages ?? []).filter(
    m => m && typeof m.content === 'string' && m.content.trim()
  )
  if (incoming.length === 0) return NextResponse.json({ error: 'No message provided' }, { status: 400 })

  // Payload / message caps — bound cost before any Gemini call.
  if (incoming.length > 20) {
    return NextResponse.json({ error: 'Conversation is too long. Please start a new chat.' }, { status: 400 })
  }
  if (incoming.some(m => m.content.length > 4000)) {
    return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
  }
  const totalLength = incoming.reduce((sum, m) => sum + m.content.length, 0)
  if (totalLength > 24000) {
    return NextResponse.json({ error: 'Conversation is too long. Please start a new chat.' }, { status: 400 })
  }

  const today = await serverToday()
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt(today),
    tools: [{ functionDeclarations: buildFunctionDeclarations() }],
  })

  // Build history from all messages except the last (sent via sendMessage).
  // Keep only the latest turns to reduce token usage and free-tier quota hits,
  // then sanitize so it starts with a user turn (Gemini requirement).
  const history = sanitizeHistory(
    incoming.slice(-9, -1).map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }],
    }))
  )

  const lastMessage = incoming[incoming.length - 1]

  try {
    const chat = model.startChat({ history })
    let result = await sendWithRetry(chat, lastMessage.content)

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = result.response
      const allFunctionCalls = response.functionCalls()
      // Cap fan-out: a single model turn can trigger at most 5 tool calls so it
      // can't spawn dozens of DB queries. (MAX_ITERATIONS bounds loop depth.)
      const functionCalls = allFunctionCalls?.slice(0, 5)

      if (!functionCalls || functionCalls.length === 0) {
        const text = response.text()?.trim()
        return NextResponse.json({
          type: 'message',
          text: text || 'Could you rephrase that, or give me a bit more detail?',
        })
      }

      // A write tool → stop the loop, surface a confirmation proposal to the client.
      // Claude / Gemini never writes to the DB itself.
      const writeCall = functionCalls.find(fc => WRITE_TOOL_NAMES.has(fc.name))
      if (writeCall) {
        return NextResponse.json({
          type: 'proposal',
          action: writeCall.name,
          params: writeCall.args ?? {},
          assistantText: '',
        })
      }

      // Read tools → execute server-side, feed results back so Gemini can answer.
      const functionResponses = await Promise.all(
        functionCalls.map(async fc => {
          const readResult = await runReadTool(
            fc.name,
            (fc.args ?? {}) as Record<string, unknown>
          )
          return {
            functionResponse: {
              name: fc.name,
              response: readResult as Record<string, unknown>,
            },
          }
        })
      )
      result = await sendWithRetry(chat, functionResponses)
    }

    return NextResponse.json({
      type: 'message',
      text: "Sorry, I couldn't complete that. Please try rephrasing.",
    })
  } catch (err) {
    console.error('Assistant route error:', err instanceof Error ? err.message : 'unknown error')
    const message = err instanceof Error ? err.message : 'Unknown assistant error'
    const status =
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : undefined
    const retryMatch = message.match(/retry in\s+([\d.]+)s/i)
    const retrySeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : undefined
    const isQuotaError =
      /quota|rate.?limit|429|resource_exhausted|retry in/i.test(message)

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: retrySeconds
            ? `You've reached your AI usage limit for now. Please try again in about ${retrySeconds} seconds.`
            : "You've reached your AI usage limit for now. Please try again in a little while.",
          ...(process.env.NODE_ENV !== 'production'
            ? {
                debug: {
                  message,
                  ...(status ? { status } : {}),
                  model: MODEL,
                },
              }
            : {}),
        },
        { status: 429 }
      )
    }

    // Transient Gemini overload (503) that survived the in-loop retries. Tell
    // the user it's a temporary upstream issue rather than a generic failure.
    if (isOverloadError(err)) {
      return NextResponse.json(
        {
          error: 'The AI service is busy right now. Please try again in a moment.',
          ...(process.env.NODE_ENV !== 'production'
            ? { debug: { message, ...(status ? { status } : {}), model: MODEL } }
            : {}),
        },
        { status: 503 }
      )
    }

    // In development, surface the upstream provider error so debugging does
    // not rely only on terminal logs.
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json(
        {
          error: 'The assistant ran into a problem. Please try again.',
          debug: {
            message,
            ...(status ? { status } : {}),
            model: MODEL,
          },
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'The assistant ran into a problem. Please try again.' },
      { status: 502 }
    )
  }
}
