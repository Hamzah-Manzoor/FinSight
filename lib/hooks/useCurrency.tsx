'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  type Currency,
  LOCALE_TO_CURRENCY,
} from '@/types'

const STORAGE_KEY = 'finsight:currency:v1'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (c: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  setCurrency: () => {},
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Currency | null
    if (stored) {
      setCurrencyState(stored)
      return
    }
    const detected = LOCALE_TO_CURRENCY[navigator.language] ?? 'USD'
    setCurrencyState(detected)
  }, [])

  function setCurrency(c: Currency) {
    setCurrencyState(c)
    localStorage.setItem(STORAGE_KEY, c)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext)
}
