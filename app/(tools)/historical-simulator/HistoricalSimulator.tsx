'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { AssetPicker } from '@/components/historical/AssetPicker'
import { MonthYearRangePicker } from '@/components/historical/MonthYearRangePicker'
import { DrawdownChart } from '@/components/historical/DrawdownChart'
import { HistoricalResultCard } from '@/components/historical/HistoricalResultCard'
import { YearlyReturnsTable } from '@/components/historical/YearlyReturnsTable'
import { Disclaimer } from '@/components/shared/Disclaimer'
import { ShareButton } from '@/components/calculator/ShareButton'
import { runSimulation } from '@/lib/calc/historical'
import { useUrlState } from '@/lib/hooks/useUrlState'
import { type AssetKey, ASSET_DATA_FILES, ASSET_META_FILES, type DataPoint, type AssetMeta } from '@/types'

function defaultStart(): string {
  return `${new Date().getFullYear() - 30}-01-01`
}

const DEFAULT_END = '2024-01-01'

const schema = z.object({
  asset: z.enum(['sp500', 'bitcoin', 'gold', 'treasury10y']).default('sp500'),
  start: z.string().default(defaultStart()),
  end: z.string().default(DEFAULT_END),
  amount: z.coerce.number().min(0).default(10000),
  pmt: z.coerce.number().min(0).default(0),
})

export function HistoricalSimulator() {
  const [urlState, syncToUrl] = useUrlState(schema, schema.parse({}))

  const [asset, setAsset] = useState<AssetKey>(urlState.asset)
  const [startDate, setStartDate] = useState(urlState.start)
  const [endDate, setEndDate] = useState(urlState.end)
  const [amount, setAmount] = useState(urlState.amount)
  const [pmt, setPmt] = useState(urlState.pmt)

  // Sync URL → local state once after mount (URL parsing is async in useUrlState)
  useEffect(() => {
    setAsset(urlState.asset)
    setStartDate(urlState.start)
    setEndDate(urlState.end)
    setAmount(urlState.amount)
    setPmt(urlState.pmt)
  }, [JSON.stringify(urlState)]) // eslint-disable-line react-hooks/exhaustive-deps

  const assetChangedRef = useRef(false)

  const [data, setData] = useState<DataPoint[] | null>(null)
  const [meta, setMeta] = useState<AssetMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
          const autoStart = `${maxYear - 30}-01-01`
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
    syncToUrl({ asset, start: startDate, end: endDate, amount, pmt })
  }, [asset, startDate, endDate, amount, pmt]) // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => {
    if (!data) return null
    try { return runSimulation(data, startDate, endDate, amount, pmt) }
    catch { return null }
  }, [data, startDate, endDate, amount, pmt])

  const dateRange = meta?.dateRange ?? { min: '1988-01-01', max: DEFAULT_END }

  function handleAssetChange(a: AssetKey) {
    assetChangedRef.current = true
    setAsset(a)
  }

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
              <label className="text-sm font-medium">Initial Investment</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Monthly Contribution{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="number"
                min={0}
                value={pmt}
                onChange={e => setPmt(Math.max(0, Number(e.target.value)))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading data…</p>}
      {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}

      {!loading && !fetchError && data && !result && (
        <p className="text-sm text-muted-foreground">
          No data available for the selected date range. Try adjusting the start or end date.
        </p>
      )}

      {!loading && result && (
        <>
          <div className="flex justify-end">
            <ShareButton />
          </div>
          <HistoricalResultCard result={result} />
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-base font-semibold">Portfolio Growth</h2>
              <DrawdownChart data={result.monthlyData} drawdowns={result.drawdowns} />
              {result.drawdowns.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Shaded areas indicate drawdowns greater than 5%.
                </p>
              )}
            </CardContent>
          </Card>
          <YearlyReturnsTable rows={result.yearlyRows} />
          <Disclaimer />
        </>
      )}
    </div>
  )
}
