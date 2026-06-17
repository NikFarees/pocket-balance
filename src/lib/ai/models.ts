// Free-tier Gemini models offered in the assistant model picker. The same list
// is the server-side allowlist: the route only accepts a `model` that appears
// here, then tries it first and falls back through GOOGLE_AI_MODEL's chain.
export const ASSISTANT_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
] as const

export type AssistantModelId = (typeof ASSISTANT_MODELS)[number]['id']

export const ASSISTANT_MODEL_IDS: readonly string[] = ASSISTANT_MODELS.map(m => m.id)

export const DEFAULT_ASSISTANT_MODEL: AssistantModelId = ASSISTANT_MODELS[0].id
