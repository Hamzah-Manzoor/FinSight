'use client'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { formatCurrency } from '@/lib/format/currency'
import { formatNumber } from '@/lib/format/number'
import { CURRENCY_LOCALES, type YearlyReturnRow } from '@/types'

interface Props { rows: YearlyReturnRow[] }

export function YearlyReturnsTable({ rows }: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setOpen(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)} className="mb-3">
        Year-by-year returns
        {open ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
      {open && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Year', 'Start Value', 'End Value', 'Annual Return'].map(h => (
                  <th key={h} className={`px-4 py-2 font-medium ${h === 'Year' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.year} className="border-t">
                  <td className="px-4 py-2">{row.year}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(row.startValue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(row.endValue)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${row.annualReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                    {row.annualReturn >= 0 ? '+' : ''}{formatNumber(row.annualReturn * 100, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
