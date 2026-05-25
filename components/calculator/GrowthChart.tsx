'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { YearlyRow } from '@/lib/calc/compound'
import { calcRealValue } from '@/lib/calc/compound'

interface GrowthChartProps {
  yearlyRows: YearlyRow[]
  p: number
  inflationOn: boolean
  inflationRate: number
  years: number
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

export function GrowthChart({
  yearlyRows,
  p,
  inflationOn,
  inflationRate,
  years,
  currency,
}: GrowthChartProps) {
  const symbol = currencySymbol(currency)

  const data = yearlyRows.map(row => ({
    year: row.year,
    principal: p,
    contributions: Math.max(0, row.totalContributed - p),
    interest: Math.max(0, row.interestEarned),
    ...(inflationOn && {
      real: calcRealValue(row.balance, inflationRate, row.year),
    }),
  }))

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Growth Over Time
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#71717a" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#71717a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gContributions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.3} />
            </linearGradient>
          </defs>
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
            formatter={(value: number, name: string) => [
              compactValue(value, symbol),
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
            labelFormatter={label => `Year ${label}`}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="principal"
            stackId="1"
            stroke="#71717a"
            fill="url(#gPrincipal)"
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="contributions"
            stackId="1"
            stroke="#059669"
            fill="url(#gContributions)"
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="interest"
            stackId="1"
            stroke="#059669"
            fill="url(#gInterest)"
            isAnimationActive={!prefersReducedMotion}
          />
          {inflationOn && (
            <Area
              type="monotone"
              dataKey="real"
              stroke="#f59e0b"
              fill="none"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={!prefersReducedMotion}
            />
          )}
          <Legend
            iconType="square"
            iconSize={10}
            formatter={value => (
              <span style={{ fontSize: '11px', opacity: 0.7 }}>
                {value === 'real'
                  ? 'Real (inflation-adj.)'
                  : value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
