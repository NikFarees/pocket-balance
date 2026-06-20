'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const LS_KEY = 'pb-amounts-hidden'

type BalanceVisibilityContextValue = {
  hidden: boolean
  toggle: () => void
}

const BalanceVisibilityContext = createContext<BalanceVisibilityContextValue>({
  hidden: false,
  toggle: () => {},
})

export function BalanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(localStorage.getItem(LS_KEY) === 'true')
  }, [])

  function toggle() {
    setHidden(prev => {
      const next = !prev
      localStorage.setItem(LS_KEY, String(next))
      return next
    })
  }

  return (
    <BalanceVisibilityContext.Provider value={{ hidden, toggle }}>
      {children}
    </BalanceVisibilityContext.Provider>
  )
}

export function useBalanceVisibility() {
  return useContext(BalanceVisibilityContext)
}
