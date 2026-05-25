'use client'

import { useCurrency } from '@/lib/hooks/useCurrency'
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, type Currency } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()

  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
      <SelectTrigger className="h-8 w-28 text-sm" aria-label="Select currency">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c} — {CURRENCY_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
