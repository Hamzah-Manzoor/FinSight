'use client'

import { ThemeProvider } from 'next-themes'
import { CurrencyProvider } from '@/lib/hooks/useCurrency'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </ThemeProvider>
  )
}
