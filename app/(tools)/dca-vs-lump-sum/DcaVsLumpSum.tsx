'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AssetPicker } from '@/components/historical/AssetPicker'
import { MonthYearRangePicker } from '@/components/historical/MonthYearRangePicker'
import { DrawdownChart } from '@/components/historical/DrawdownChart'
import { WinRateHistogram } from '@/components/historical/WinRateHistogram'
import { Disclaimer } from '@/components/shared/Disclaimer'
import { ShareButton } from '@/components/calculator/ShareButton'
import { runDca, runLumpSum, compareStrategies, analyzeAllStartDates } from '@/lib/calc/dca'
import { useUrlState } from '@/lib/hooks/useUrlState'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { formatCurrency } from '@/lib/format/currency'
import { formatNumber } from '@/lib/format/number'
import {
  type AssetKey, ASSET_DATA_FILES, ASSET_META_FILES,
  type DataPoint, type AssetMeta, CURRENCY_LOCALES,
} from '@/types'

function defaultStart(): string {
  return `${new Date().getFullYear() - 20}-01-01`
}

const DEFAULT_END = '2024-01-01'

const schema = z.object({
  asset: z.enum(['sp500', 'bitcoin', 'gold', 'treasury10y']).default('sp500'),
  start: z.string().default(defaultStart()),
  end: z.string().default(DEFAULT_END),
  amount: z.coerce.number().min(0).default(10000),
  freq: z.enum(['monthly', 'weekly']).default('monthly'),
  hist: z.preprocess(v => v === '1' || v === true, z.boolean()).default(false),
})

export function DcaVsLumpSum() {
  const [urlState, syncToUrl] = useUrlState(schema, schema.parse({}))

  const [asset, setAsset] = useState<AssetKey>(urlState.asset)
  const [startDate, setStartDate] = useState(urlState.start)
  const [endDate, setEndDate] = useState(urlState.end)
  const [amount, setAmount] = useState(urlState.amount)
  const [freq, setFreq] = useState<'monthly' | 'weekly'>(urlState.freq)
  const [showHistogram, setShowHistogram] = useState(urlState.hist)

  useEffect(() => {
    setAsset(urlState.asset)
    setStartDate(urlState.start)
    setEndDate(urlState.end)
    setAmount(urlState.amount)
    setFreq(urlState.freq)
    setShowHistogram(urlState.hist)
  }, [JSON.stringify(urlState)]) // eslint-disable-line react-hooks/exhaustive-deps

  const [data, setData] = useState<DataPoint[] | null>(null)
  const [meta, setMeta] = useState<AssetMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const assetChangedRef = useRef(false)

  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setFetchError(null)
    Promise.all([
      fetch(ASSET_DATA_FILES[asset], { signal: controller.signal }).then(r => r.json() as Promise<DataPoint[]>),
      fetch(ASSET_META_FILES[asset], { signal: controller.signal }).then(r => r.json() as Promise<AssetMeta>),
    ])
      .then(([d, m]) => {
        setData(d)
        setMeta(m)
        // Update end date to meta's most recent data point on first load
        // (only if user hasn't set a different end date via URL)
        if (endDate === DEFAULT_END) {
          setEndDate(m.dateRange.max)
        }
        if (assetChangedRef.current) {
          assetChangedRef.current = false
          const maxYear = parseInt(m.dateRange.max.substring(0, 4), 10)
          const autoStart = `${maxYear - 20}-01-01`
          setEndDate(m.dateRange.max)
          setStartDate(autoStart >= m.dateRange.min ? autoStart : m.dateRange.min)
        }
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return
        assetChangedRef.current = false
        setFetchError('Failed to load asset data. Please try again.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [asset])

  useEffect(() => {
    syncToUrl({ asset, start: startDate, end: endDate, amount, freq, hist: showHistogram })
  }, [asset, startDate, endDate, amount, freq, showHistogram]) // eslint-disable-line react-hooks/exhaustive-deps

  const comparison = useMemo(() => {
    if (!data) return null
    try {
      const dca = runDca(data, startDate, endDate, amount, freq)
      const ls = runLumpSum(data, startDate, endDate, amount)
      return compareStrategies(dca, ls)
    } catch { return null }
  }, [data, startDate, endDate, amount, freq])

  const windowMonths = useMemo(() => {
    const [sy, sm] = startDate.substring(0, 7).split('-').map(Number)
    const [ey, em] = endDate.substring(0, 7).split('-').map(Number)
    return (ey - sy) * 12 + (em - sm)
  }, [startDate, endDate])

  const histogram = useMemo(() => {
    if (!data || !showHistogram || windowMonths < 1) return null
    return analyzeAllStartDates(data, windowMonths, amount, freq)
  }, [data, showHistogram, windowMonths, amount, freq])

  const dateRange = meta?.dateRange ?? { min: '1988-01-01', max: DEFAULT_END }

  function handleAssetChange(a: AssetKey) {
    assetChangedRef.current = true
    setAsset(a)
  }

  const winnerLabel =
    comparison?.winner === 'tie'
      ? 'Both strategies performed equally.'
      : comparison
      ? `${comparison.winner === 'lumpSum' ? 'Lump sum' : 'DCA'} wins by ${fmt(comparison.diffAbsolute)} (${formatNumber(comparison.diffPercent * 100, 1)}% of invested capital)`
      : ''

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AssetPicker value={asset} onChange={handleAssetChange} />
            <MonthYearRangePicker
              startDate={startDate}
              endDate={endDate}
              minDate={dateRange.min}
              maxDate={dateRange.max}
              onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Total Amount to Invest</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">DCA Frequency</label>
              <Select value={freq} onValueChange={v => setFreq(v as 'monthly' | 'weekly')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading data…</p>}
      {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}

      {!loading && !fetchError && data && !comparison && (
        <p className="text-sm text-muted-foreground">
          No data available for the selected date range. Try adjusting the start or end date.
        </p>
      )}

      {!loading && comparison && (
        <>
          <div className="flex justify-end"><ShareButton /></div>

          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Lump Sum</p>
                  <p className="text-3xl font-bold tabular-nums">{fmt(comparison.lumpSum.finalValue)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CAGR {formatNumber(comparison.lumpSum.cagr * 100, 1)}%
                    {' · '}return {formatNumber(comparison.lumpSum.totalReturn * 100, 1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">DCA ({freq})</p>
                  <p className="text-3xl font-bold tabular-nums">{fmt(comparison.dca.finalValue)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CAGR {formatNumber(comparison.dca.cagr * 100, 1)}%
                    {' · '}return {formatNumber(comparison.dca.totalReturn * 100, 1)}%
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium">{winnerLabel}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-base font-semibold">Portfolio Growth</h2>
              <DrawdownChart
                mode="dual"
                series={[
                  { name: 'Lump Sum', color: 'hsl(var(--chart-2))', data: comparison.lumpSum.monthlyData },
                  { name: 'DCA', color: 'hsl(var(--chart-1))', data: comparison.dca.monthlyData },
                ]}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Switch id="hist" checked={showHistogram} onCheckedChange={setShowHistogram} />
            <label htmlFor="hist" className="cursor-pointer text-sm">
              Show all historical start dates
            </label>
          </div>

          {showHistogram && histogram && histogram.totalPeriods > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="mb-4 text-base font-semibold">
                  All {windowMonths}-month windows in this dataset
                </h2>
                <WinRateHistogram analysis={histogram} />
              </CardContent>
            </Card>
          )}

          {showHistogram && histogram && histogram.totalPeriods === 0 && (
            <p className="text-sm text-muted-foreground">
              Not enough historical data for the selected window length.
            </p>
          )}

          <Disclaimer />
        </>
      )}
    </div>
  )
}
