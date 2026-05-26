'use client'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { DataPoint, DrawdownPeriod } from '@/types'
import { formatCompact } from '@/lib/format/number'

interface SingleProps {
  mode?: 'single'
  data: DataPoint[]
  drawdowns: DrawdownPeriod[]
  color?: string
}

interface DualProps {
  mode: 'dual'
  series: Array<{ name: string; color: string; data: DataPoint[] }>
}

type Props = SingleProps | DualProps

function yLabel(v: number) { return `$${formatCompact(v)}` }
function xLabel(d: string) { return d.substring(0, 4) }

export function DrawdownChart(props: Props) {
  const noAnim =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (props.mode === 'dual') {
    const { series } = props
    const chartData = series[0].data.map((d, i) => {
      const row: Record<string, unknown> = { date: d.date }
      series.forEach(s => { row[s.name] = s.data[i]?.value })
      return row
    })

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tickFormatter={xLabel} interval="preserveStartEnd" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={yLabel} width={72} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: ValueType | undefined) => [`$${formatCompact(Number(Array.isArray(v) ? v[0] : (v ?? 0)))}`]} labelFormatter={l => String(l)} />
          <Legend />
          {series.map(s => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} dot={false} isAnimationActive={!noAnim} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const { data, drawdowns, color = 'hsl(var(--chart-1))' } = props as SingleProps & { data: DataPoint[]; drawdowns: DrawdownPeriod[] }
  const chartData = data.map(d => ({ date: d.date, value: d.value }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tickFormatter={xLabel} interval="preserveStartEnd" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={yLabel} width={72} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: ValueType | undefined) => [`$${formatCompact(Number(Array.isArray(v) ? v[0] : (v ?? 0)))}`, 'Portfolio']} labelFormatter={l => String(l)} />
        {drawdowns.map((d, i) => (
          <ReferenceArea key={i} x1={d.startDate} x2={d.endDate} fill="hsl(var(--destructive))" fillOpacity={0.15} />
        ))}
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#areaGrad)" dot={false} isAnimationActive={!noAnim} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
