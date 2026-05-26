'use client'
import { useState, useEffect, useId } from 'react'
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
  const uid = useId().replace(/:/g, '')

  const data = yearlyRows.map(row => {
    const actualBalance = Math.max(0, row.balance)
    const totalCont = row.totalContributed

    if (actualBalance >= totalCont) {
      // Normal case: balance > what was invested (positive net returns)
      return {
        year: row.year,
        principal: p,
        contributions: Math.max(0, totalCont - p),
        interest: actualBalance - totalCont,
        ...(inflationOn && {
          real: calcRealValue(row.balance, inflationRate, row.year),
        }),
      }
    } else {
      // Negative net return: balance less than total invested — scale bands proportionally
      const ratio = totalCont > 0 ? actualBalance / totalCont : 0
      return {
        year: row.year,
        principal: p * ratio,
        contributions: Math.max(0, totalCont - p) * ratio,
        interest: 0,
        ...(inflationOn && {
          real: calcRealValue(row.balance, inflationRate, row.year),
        }),
      }
    }
  })

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div aria-hidden="true" className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Growth Over Time
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`${uid}P`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#71717a" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#71717a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id={`${uid}C`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id={`${uid}I`} x1="0" y1="0" x2="0" y2="1">
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
            formatter={(value, name) => {
              const v = typeof value === 'number' ? value : 0
              const n = String(name)
              const label = n === 'real' ? 'Real (inflation-adj.)' : n.charAt(0).toUpperCase() + n.slice(1)
              return [compactValue(v, symbol), label]
            }}
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
            fill={`url(#${uid}P)`}
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="contributions"
            stackId="1"
            stroke="#059669"
            fill={`url(#${uid}C)`}
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="interest"
            stackId="1"
            stroke="#059669"
            fill={`url(#${uid}I)`}
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
