'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typings for the Web Speech API (not in the default DOM lib).
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/**
 * Thin wrapper over the browser Web Speech API for speech-to-text. `supported`
 * is false on browsers without it (e.g. Firefox) so the caller can hide the mic.
 */
export function useSpeechRecognition(onTranscript: (text: string) => void) {
  // Lazy initializer reads capability during render (SSR → false). The widget
  // renders only a FAB until opened, so this never causes a hydration mismatch.
  const [supported] = useState(() => getCtor() !== null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbackRef = useRef(onTranscript)

  useEffect(() => {
    callbackRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = e => {
      const transcript = Array.from({ length: e.results.length })
        .map((_, i) => e.results[i][0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (transcript) callbackRef.current(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try { recognition.stop() } catch { /* ignore */ }
    }
  }, [])

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    if (listening) {
      try { recognition.stop() } catch { /* ignore */ }
      setListening(false)
    } else {
      try {
        recognition.start()
        setListening(true)
      } catch {
        setListening(false)
      }
    }
  }, [listening])

  return { supported, listening, toggle }
}
