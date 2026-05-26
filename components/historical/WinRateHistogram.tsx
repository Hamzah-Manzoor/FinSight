'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatNumber, formatCompact } from '@/lib/format/number'
import type { AllStartDatesAnalysis } from '@/types'

interface Props { analysis: AllStartDatesAnalysis }

export function WinRateHistogram({ analysis }: Props) {
  const { distribution, lumpSumWinRate, dcaWinRate, totalPeriods } = analysis

  const chartData = distribution.map(d => ({
    date: d.startDate.substring(0, 7),
    diff: d.lumpSumFinalValue - d.dcaFinalValue,  // positive = lump sum wins
    winner: d.winner,
  }))

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Across <strong>{totalPeriods}</strong> historical periods —{' '}
        <strong>lump sum won {formatNumber(lumpSumWinRate * 100, 0)}%</strong> of the time
        {' · '}DCA won {formatNumber(dcaWinRate * 100, 0)}%
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            tick={{ fontSize: 11 }}
          />
          <YAxis tickFormatter={v => `$${formatCompact(Math.abs(v as number))}`} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: unknown) => {
              const num = typeof v === 'number' ? v : Array.isArray(v) ? (v[0] as number) : 0
              return [
                `$${formatCompact(Math.abs(num))}`,
                num >= 0 ? 'Lump sum advantage' : 'DCA advantage',
              ]
            }}
            labelFormatter={l => `Start: ${l}`}
          />
          <Bar dataKey="diff" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.winner === 'lumpSum'
                    ? '#22c55e'
                    : entry.winner === 'dca'
                    ? '#3b82f6'
                    : '#9ca3af'
                }
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#22c55e' }} />
          Lump sum wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#3b82f6' }} />
          DCA wins
        </span>
      </div>
    </div>
  )
}
