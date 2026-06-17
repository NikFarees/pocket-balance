// Free-tier Gemini text models offered in the assistant model picker, ordered
// by daily request quota (highest first). The same list is the server-side
// allowlist: the route only accepts a `model` that appears here, then tries it
// first and falls back through GOOGLE_AI_MODEL's chain. Limits per Google AI
// Studio free tier (RPD = requests/day): 3.1 Flash Lite = 500, the rest = 20.
export const ASSISTANT_MODELS = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (500/day)' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
] as const

export type AssistantModelId = (typeof ASSISTANT_MODELS)[number]['id']

export const ASSISTANT_MODEL_IDS: readonly string[] = ASSISTANT_MODELS.map(m => m.id)

export const DEFAULT_ASSISTANT_MODEL: AssistantModelId = ASSISTANT_MODELS[0].id
