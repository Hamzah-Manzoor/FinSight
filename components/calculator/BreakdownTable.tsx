'use client'
import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatCurrency } from '@/lib/format/currency'
import type { YearlyRow } from '@/lib/calc/compound'

interface BreakdownTableProps {
  rows: YearlyRow[]
  currency: string
  locale: string
}

export function BreakdownTable({ rows, currency, locale }: BreakdownTableProps) {
  const [open, setOpen] = useState(false)
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  const table = (
    <div className="overflow-x-auto rounded-xl border ring-1 ring-foreground/10">
      <table className="w-full text-sm tabular-nums">
        <thead className="border-b bg-muted/50">
          <tr>
            {['Year', 'Balance', 'Contributed', 'Interest'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => (
            <tr key={row.year} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2.5 font-medium">{row.year}</td>
              <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
                {fmt(row.balance)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{fmt(row.totalContributed)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{fmt(row.interestEarned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Year-by-Year Breakdown</h2>

      {/* Desktop: always visible */}
      <div className="hidden lg:block">{table}</div>

      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium ring-1 ring-foreground/10">
            {open ? 'Hide breakdown' : 'Show year-by-year breakdown'}
            {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">{table}</CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  )
}
