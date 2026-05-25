import { formatCurrency } from '@/lib/format/currency'
import type { ScenarioResult } from '@/lib/hooks/useScenarios'

interface ComparisonTableProps {
  baseResult: ScenarioResult
  scenarioResults: ScenarioResult[]
  currency: string
  locale: string
}

export function ComparisonTable({
  baseResult,
  scenarioResults,
  currency,
  locale,
}: ComparisonTableProps) {
  const fmt = (v: number) => formatCurrency(v, currency, locale)
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
  const allResults = [baseResult, ...scenarioResults]

  return (
    <div className="rounded-xl border bg-card ring-1 ring-foreground/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Scenario
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Final Balance
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Contributed
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Interest Earned
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              CAGR
            </th>
          </tr>
        </thead>
        <tbody>
          {allResults.map((result, i) => (
            <tr key={result.id} className={i < allResults.length - 1 ? 'border-b' : ''}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full flex-shrink-0"
                    style={{ background: result.color }}
                  />
                  <span className="font-medium">{result.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {fmt(result.finalBalance)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {fmt(result.totalContributed)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {fmt(result.interestEarned)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {fmtPct(result.cagr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
