'use client'
import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ScenarioResult } from '@/lib/hooks/useScenarios'

interface ScenarioComparisonChartProps {
  baseResult: ScenarioResult
  scenarioResults: ScenarioResult[]
  currency: string
}

function compactValue(value: number, symbol: string): string {
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K`
  return `${symbol}${Math.round(value)}`
}

function currencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
        .formatToParts(0)
        .find(p => p.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

export function ScenarioComparisonChart({
  baseResult,
  scenarioResults,
  currency,
}: ScenarioComparisonChartProps) {
  const symbol = currencySymbol(currency)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const allResults = [baseResult, ...scenarioResults]

  // Build a unified year list (union of all scenarios' year sets)
  const maxYear = Math.max(...allResults.map(r => r.yearlyRows.at(-1)?.year ?? 0))

  const data = Array.from({ length: maxYear }, (_, i) => {
    const year = i + 1
    const point: Record<string, number> = { year }
    for (const result of allResults) {
      const row = result.yearlyRows.find(r => r.year === year)
      if (row) point[result.id] = row.balance
    }
    return point
  })

  const LINE_COLORS: Record<string, string> = {
    [baseResult.id]: '#059669',
    ...Object.fromEntries(scenarioResults.map(r => [r.id, r.color])),
  }

  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Scenario Comparison
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={v => compactValue(v, symbol)}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value, dataKey) => {
              const v = typeof value === 'number' ? value : 0
              const result = allResults.find(r => r.id === dataKey)
              return [compactValue(v, symbol), result?.name ?? String(dataKey)]
            }}
            labelFormatter={label => `Year ${label}`}
            contentStyle={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => {
              const result = allResults.find(r => r.id === value)
              return <span style={{ fontSize: '11px', opacity: 0.8 }}>{result?.name ?? value}</span>
            }}
          />
          {allResults.map(result => (
            <Line
              key={result.id}
              type="monotone"
              dataKey={result.id}
              stroke={LINE_COLORS[result.id]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={!prefersReducedMotion}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
