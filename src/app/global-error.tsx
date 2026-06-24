'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
