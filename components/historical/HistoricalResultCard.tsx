'use client'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { formatCurrency } from '@/lib/format/currency'
import { formatNumber } from '@/lib/format/number'
import { CURRENCY_LOCALES, type SimulationResult } from '@/types'

interface Props { result: SimulationResult }

export function HistoricalResultCard({ result }: Props) {
  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const fmt = (v: number) => formatCurrency(v, currency, locale)
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${formatNumber(v * 100, 1)}%`

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-1">
          You invested {fmt(result.totalInvested)} and ended up with
        </p>
        <p className="text-4xl font-bold tabular-nums">{fmt(result.finalValue)}</p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>
            <span className="text-muted-foreground">Total return </span>
            <span className={result.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
              {pct(result.totalReturn)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">CAGR </span>
            <span className={result.cagr >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
              {pct(result.cagr)}
            </span>
          </span>
          {result.worstDrawdown.depth < -0.05 && (
            <span>
              <span className="text-muted-foreground">Worst drawdown </span>
              <span className="text-destructive">
                {formatNumber(result.worstDrawdown.depth * 100, 1)}% over {result.worstDrawdown.durationMonths} months
              </span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
