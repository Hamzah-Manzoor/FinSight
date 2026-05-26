# Phase 4 — Historical Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/historical-simulator` and `/dca-vs-lump-sum` pages backed by static historical JSON data for S&P 500, Bitcoin, Gold, and US Treasuries.

**Architecture:** A one-time dev script downloads and normalizes public historical data into `/public/data/*.json`. Both pages lazy-fetch the selected asset's JSON on the client, run pure calculation functions, and render shared `components/historical/` primitives. No server-side data fetching.

**Tech Stack:** Next.js 15, TypeScript, Recharts, shadcn/ui (Select, Card, Collapsible, Switch), Vitest, tsx (script runner)

---

## File Map

```
scripts/fetch-historical-data.ts              new — one-time data fetch script
public/data/{sp500,bitcoin,gold,treasury10y}.json      new
public/data/{sp500,bitcoin,gold,treasury10y}.meta.json new

types/index.ts                                modify — append historical types + constants

lib/calc/historical.ts                        new — getDateRange, calcCAGR, calcDrawdowns, runSimulation
lib/calc/historical.test.ts                   new
lib/calc/dca.ts                               new — runLumpSum, runDca, compareStrategies, analyzeAllStartDates
lib/calc/dca.test.ts                          new

components/historical/AssetPicker.tsx         new
components/historical/MonthYearRangePicker.tsx new
components/historical/DrawdownChart.tsx       new — single-area or dual-line modes, drawdown shading
components/historical/HistoricalResultCard.tsx new
components/historical/YearlyReturnsTable.tsx  new
components/historical/WinRateHistogram.tsx    new

app/(tools)/historical-simulator/HistoricalSimulator.tsx  new — client component
app/(tools)/historical-simulator/page.tsx                  modify
app/(tools)/dca-vs-lump-sum/DcaVsLumpSum.tsx               new — client component
app/(tools)/dca-vs-lump-sum/page.tsx                        modify
```

---

## Task 1: Add historical types to `types/index.ts`

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Append the following to `types/index.ts`**

```typescript
// ── Historical simulator types ──────────────────────────────────────────────

export type AssetKey = 'sp500' | 'bitcoin' | 'gold' | 'treasury10y'

export interface DataPoint {
  date: string   // "YYYY-MM-DD"
  value: number
}

export interface AssetMeta {
  source: string
  license: string
  lastUpdated: string
  dateRange: { min: string; max: string }
  note?: string
}

export interface DrawdownPeriod {
  startDate: string
  endDate: string
  depth: number          // negative decimal, e.g. -0.34 means -34%
  durationMonths: number
}

export interface YearlyReturnRow {
  year: number
  startValue: number
  endValue: number
  annualReturn: number   // decimal
}

export interface SimulationResult {
  finalValue: number
  totalInvested: number
  totalReturn: number    // decimal
  cagr: number           // decimal — asset's own price CAGR
  monthlyData: DataPoint[]
  yearlyRows: YearlyReturnRow[]
  drawdowns: DrawdownPeriod[]
  worstDrawdown: DrawdownPeriod
}

export interface StrategyResult {
  finalValue: number
  totalInvested: number
  totalReturn: number
  cagr: number
  monthlyData: DataPoint[]
}

export interface ComparisonResult {
  dca: StrategyResult
  lumpSum: StrategyResult
  winner: 'dca' | 'lumpSum' | 'tie'
  diffAbsolute: number
  diffPercent: number   // as fraction of totalInvested
}

export interface StartDateDistributionEntry {
  startDate: string
  dcaFinalValue: number
  lumpSumFinalValue: number
  winner: 'dca' | 'lumpSum' | 'tie'
}

export interface AllStartDatesAnalysis {
  totalPeriods: number
  dcaWins: number
  lumpSumWins: number
  ties: number
  dcaWinRate: number
  lumpSumWinRate: number
  distribution: StartDateDistributionEntry[]
}

export const ASSET_LABELS: Record<AssetKey, string> = {
  sp500: 'S&P 500 (Total Return)',
  bitcoin: 'Bitcoin',
  gold: 'Gold',
  treasury10y: 'US 10Y Treasury',
}

export const ASSET_DATA_FILES: Record<AssetKey, string> = {
  sp500: '/data/sp500.json',
  bitcoin: '/data/bitcoin.json',
  gold: '/data/gold.json',
  treasury10y: '/data/treasury10y.json',
}

export const ASSET_META_FILES: Record<AssetKey, string> = {
  sp500: '/data/sp500.meta.json',
  bitcoin: '/data/bitcoin.meta.json',
  gold: '/data/gold.meta.json',
  treasury10y: '/data/treasury10y.meta.json',
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add historical simulator types and asset constants"
```

---

## Task 2: Data fetch script

**Files:**
- Create: `scripts/fetch-historical-data.ts`
- Create: `public/data/` (directory + 8 files after running the script)

- [ ] **Step 1: Verify `tsx` is available**

```bash
npx tsx --version
```

If it fails, install it: `npm install -D tsx`

- [ ] **Step 2: Create `scripts/fetch-historical-data.ts`**

```typescript
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface DataPoint { date: string; value: number }

const OUT = join(process.cwd(), 'public', 'data')

function write(name: string, data: DataPoint[], meta: object) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 2))
  writeFileSync(join(OUT, `${name}.meta.json`), JSON.stringify(meta, null, 2))
  const first = data[0].date
  const last = data[data.length - 1].date
  console.log(`✓ ${name}: ${data.length} points (${first} → ${last})`)
}

function tsToDate(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

async function yahoo(ticker: string): Promise<DataPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=max`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Yahoo ${ticker}: HTTP ${res.status}`)
  const json = await res.json() as any
  const result = json.chart.result[0]
  const timestamps: number[] = result.timestamp
  const closes: (number | null)[] =
    result.indicators.adjclose?.[0]?.adjclose ?? result.indicators.quote[0].close
  const points: DataPoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) points.push({ date: tsToDate(timestamps[i]), value: closes[i]! })
  }
  return points
}

const today = new Date().toISOString().split('T')[0]

async function sp500() {
  const data = await yahoo('^SP500TR')
  write('sp500', data, {
    source: 'Yahoo Finance ^SP500TR (S&P 500 Total Return Index)',
    license: 'public',
    lastUpdated: today,
    dateRange: { min: data[0].date, max: data[data.length - 1].date },
  })
}

async function bitcoin() {
  const data = await yahoo('BTC-USD')
  write('bitcoin', data, {
    source: 'Yahoo Finance BTC-USD',
    license: 'public',
    lastUpdated: today,
    dateRange: { min: data[0].date, max: data[data.length - 1].date },
  })
}

async function gold() {
  const data = await yahoo('GC=F')
  write('gold', data, {
    source: 'Yahoo Finance GC=F (Gold Futures)',
    license: 'public',
    lastUpdated: today,
    dateRange: { min: data[0].date, max: data[data.length - 1].date },
  })
}

async function treasury() {
  // IEF = iShares 7-10 Year Treasury Bond ETF; good proxy for 10Y Treasury total return
  const data = await yahoo('IEF')
  write('treasury10y', data, {
    source: 'Yahoo Finance IEF (iShares 7-10Y Treasury Bond ETF) — proxy for US 10Y Treasury total return',
    license: 'public',
    lastUpdated: today,
    dateRange: { min: data[0].date, max: data[data.length - 1].date },
    note: 'IEF inception 2002-07. Tracks 7-10Y US Treasuries.',
  })
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  await sp500()
  await bitcoin()
  await gold()
  await treasury()
  console.log('\n✅ All data written to public/data/')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Run the script**

```bash
npx tsx scripts/fetch-historical-data.ts
```

Expected output (dates will vary by run date):
```
✓ sp500: ~440 points (1988-02-01 → 2026-XX-01)
✓ bitcoin: ~170 points (2014-09-01 → 2026-XX-01)
✓ gold: ~620 points (1975-01-01 → 2026-XX-01)
✓ treasury10y: ~280 points (2002-07-01 → 2026-XX-01)

✅ All data written to public/data/
```

If any ticker fails with HTTP 429 (rate limit), wait 30 seconds and retry that asset.

- [ ] **Step 4: Spot-check the output**

```bash
node -e "const d = require('./public/data/sp500.json'); console.log('Points:', d.length, '| First:', d[0], '| Last:', d[d.length-1])"
node -e "const m = require('./public/data/sp500.meta.json'); console.log(m)"
```

Expected: `date` fields are `"YYYY-MM-DD"`, `value` is a positive number.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-historical-data.ts public/data/
git commit -m "feat: add historical data fetch script and commit data files"
```

---

## Task 3: `lib/calc/historical.ts` (TDD)

**Files:**
- Create: `lib/calc/historical.test.ts`
- Create: `lib/calc/historical.ts`

- [ ] **Step 1: Write `lib/calc/historical.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { getDateRange, calcCAGR, calcDrawdowns, runSimulation } from './historical'
import type { DataPoint } from '../../types'

const data: DataPoint[] = [
  { date: '2020-01-01', value: 100 },
  { date: '2020-02-01', value: 110 },  // peak
  { date: '2020-03-01', value: 80 },   // drawdown starts
  { date: '2020-04-01', value: 85 },
  { date: '2020-05-01', value: 115 },  // recovery (≥ 110)
  { date: '2020-06-01', value: 120 },
]

describe('getDateRange', () => {
  it('returns first and last dates', () => {
    expect(getDateRange(data)).toEqual({ min: '2020-01-01', max: '2020-06-01' })
  })
  it('throws on empty array', () => {
    expect(() => getDateRange([])).toThrow('Empty dataset')
  })
})

describe('calcCAGR', () => {
  it('$100 → $200 in 10 years ≈ 7.177%', () => {
    expect(calcCAGR(100, 200, 10)).toBeCloseTo(0.07177, 4)
  })
  it('returns 0 when years = 0', () => {
    expect(calcCAGR(100, 200, 0)).toBe(0)
  })
  it('returns 0 when startValue = 0', () => {
    expect(calcCAGR(0, 200, 10)).toBe(0)
  })
})

describe('calcDrawdowns', () => {
  it('detects the 110→80 drawdown (-27.3%)', () => {
    const dd = calcDrawdowns(data)
    expect(dd).toHaveLength(1)
    expect(dd[0].depth).toBeCloseTo(-0.2727, 3)
    expect(dd[0].startDate).toBe('2020-02-01')
    expect(dd[0].endDate).toBe('2020-05-01')
    expect(dd[0].durationMonths).toBe(3)
  })

  it('returns [] when no drawdown exceeds 5%', () => {
    const rising: DataPoint[] = [
      { date: '2020-01-01', value: 100 },
      { date: '2020-02-01', value: 103 },
      { date: '2020-03-01', value: 106 },
    ]
    expect(calcDrawdowns(rising)).toHaveLength(0)
  })

  it('handles ongoing drawdown at end of data', () => {
    const falling: DataPoint[] = [
      { date: '2020-01-01', value: 100 },
      { date: '2020-02-01', value: 50 },
    ]
    const dd = calcDrawdowns(falling)
    expect(dd).toHaveLength(1)
    expect(dd[0].depth).toBeCloseTo(-0.5, 3)
  })
})

describe('runSimulation', () => {
  it('grows lump sum by the asset return (100→120 = +20%)', () => {
    const result = runSimulation(data, '2020-01-01', '2020-06-01', 1000, 0)
    expect(result.finalValue).toBeCloseTo(1200, 0)
    expect(result.totalReturn).toBeCloseTo(0.2, 3)
    expect(result.totalInvested).toBe(1000)
  })

  it('adds monthly contributions to totalInvested', () => {
    const result = runSimulation(data, '2020-01-01', '2020-06-01', 1000, 100)
    expect(result.totalInvested).toBeCloseTo(1500, 0) // 1000 + 5 × 100
  })

  it('throws when fewer than 2 data points in range', () => {
    expect(() => runSimulation(data, '2030-01-01', '2030-06-01', 1000, 0))
      .toThrow('Not enough data')
  })

  it('monthlyData has same length as slice', () => {
    const result = runSimulation(data, '2020-01-01', '2020-06-01', 1000, 0)
    expect(result.monthlyData).toHaveLength(6)
  })

  it('worstDrawdown depth is 0 when no significant drawdown', () => {
    const rising: DataPoint[] = [
      { date: '2020-01-01', value: 100 },
      { date: '2020-02-01', value: 110 },
      { date: '2020-03-01', value: 120 },
    ]
    const result = runSimulation(rising, '2020-01-01', '2020-03-01', 1000, 0)
    expect(result.worstDrawdown.depth).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npx vitest run lib/calc/historical.test.ts
```

Expected: all tests fail with "Cannot find module './historical'".

- [ ] **Step 3: Create `lib/calc/historical.ts`**

```typescript
import type { DataPoint, DrawdownPeriod, SimulationResult, YearlyReturnRow } from '@/types'

export function getDateRange(data: DataPoint[]): { min: string; max: string } {
  if (data.length === 0) throw new Error('Empty dataset')
  return { min: data[0].date, max: data[data.length - 1].date }
}

export function calcCAGR(startValue: number, endValue: number, years: number): number {
  if (years <= 0 || startValue <= 0) return 0
  return Math.pow(endValue / startValue, 1 / years) - 1
}

export function calcDrawdowns(data: DataPoint[]): DrawdownPeriod[] {
  if (data.length < 2) return []

  const results: DrawdownPeriod[] = []
  let peakValue = data[0].value
  let peakIdx = 0
  let inDrawdown = false
  let troughValue = data[0].value

  for (let i = 1; i < data.length; i++) {
    const v = data[i].value
    if (v >= peakValue) {
      if (inDrawdown) {
        const depth = (troughValue - peakValue) / peakValue
        if (depth < -0.05) {
          results.push({ startDate: data[peakIdx].date, endDate: data[i].date, depth, durationMonths: i - peakIdx })
        }
        inDrawdown = false
      }
      peakValue = v
      peakIdx = i
      troughValue = v
    } else {
      inDrawdown = true
      if (v < troughValue) troughValue = v
    }
  }

  if (inDrawdown) {
    const depth = (troughValue - peakValue) / peakValue
    if (depth < -0.05) {
      results.push({
        startDate: data[peakIdx].date,
        endDate: data[data.length - 1].date,
        depth,
        durationMonths: data.length - 1 - peakIdx,
      })
    }
  }

  return results
}

export function runSimulation(
  data: DataPoint[],
  startDate: string,
  endDate: string,
  initialInvestment: number,
  monthlyContribution: number,
): SimulationResult {
  const slice = data.filter(d => d.date >= startDate && d.date <= endDate)
  if (slice.length < 2) throw new Error('Not enough data in selected range')

  let balance = initialInvestment
  let totalInvested = initialInvestment
  const monthlyData: DataPoint[] = [{ date: slice[0].date, value: balance }]
  const yearlyRows: YearlyReturnRow[] = []
  let yearStartBalance = balance

  for (let i = 1; i < slice.length; i++) {
    const monthReturn = (slice[i].value - slice[i - 1].value) / slice[i - 1].value
    balance = balance * (1 + monthReturn) + monthlyContribution
    totalInvested += monthlyContribution
    monthlyData.push({ date: slice[i].date, value: balance })

    const currYear = parseInt(slice[i].date.substring(0, 4))
    const isYearEnd =
      i === slice.length - 1 ||
      slice[i + 1].date.substring(0, 4) !== slice[i].date.substring(0, 4)

    if (isYearEnd) {
      yearlyRows.push({
        year: currYear,
        startValue: yearStartBalance,
        endValue: balance,
        annualReturn: (balance - yearStartBalance) / yearStartBalance,
      })
      yearStartBalance = balance
    }
  }

  const drawdowns = calcDrawdowns(monthlyData)
  const worstDrawdown =
    drawdowns.length > 0
      ? drawdowns.reduce((w, d) => (d.depth < w.depth ? d : w))
      : { startDate: slice[0].date, endDate: slice[slice.length - 1].date, depth: 0, durationMonths: 0 }

  const years = (slice.length - 1) / 12

  return {
    finalValue: balance,
    totalInvested,
    totalReturn: totalInvested > 0 ? (balance - totalInvested) / totalInvested : 0,
    cagr: calcCAGR(slice[0].value, slice[slice.length - 1].value, years),
    monthlyData,
    yearlyRows,
    drawdowns,
    worstDrawdown,
  }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npx vitest run lib/calc/historical.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/calc/historical.ts lib/calc/historical.test.ts
git commit -m "feat: add historical simulation calc functions with tests"
```

---

## Task 4: `lib/calc/dca.ts` (TDD)

**Files:**
- Create: `lib/calc/dca.test.ts`
- Create: `lib/calc/dca.ts`

- [ ] **Step 1: Write `lib/calc/dca.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { runLumpSum, runDca, compareStrategies, analyzeAllStartDates } from './dca'
import type { DataPoint } from '../../types'

// Steadily rising: lump sum wins (you'd rather own all units from day 1)
const rising: DataPoint[] = Array.from({ length: 25 }, (_, i) => ({
  date: `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
  value: 100 + i * 2,
}))

// Falls then recovers past start: DCA buys cheap units, wins
const volatile: DataPoint[] = [
  { date: '2020-01-01', value: 100 },
  { date: '2020-02-01', value: 80 },
  { date: '2020-03-01', value: 60 },
  { date: '2020-04-01', value: 80 },
  { date: '2020-05-01', value: 100 },
  { date: '2020-06-01', value: 120 },
]

describe('runLumpSum', () => {
  it('scales investment by price ratio', () => {
    // price 100 → 148 (+48%), $10k → $14,800
    const r = runLumpSum(rising, rising[0].date, rising[rising.length - 1].date, 10000)
    expect(r.finalValue).toBeCloseTo(14800, 0)
    expect(r.totalInvested).toBe(10000)
  })

  it('monthlyData has same length as slice', () => {
    const r = runLumpSum(rising, rising[0].date, rising[rising.length - 1].date, 10000)
    expect(r.monthlyData).toHaveLength(rising.length)
  })

  it('throws when no data in range', () => {
    expect(() => runLumpSum(rising, '2030-01-01', '2030-06-01', 10000))
      .toThrow('Not enough data')
  })
})

describe('runDca', () => {
  it('totalInvested equals totalAmount', () => {
    const r = runDca(rising, rising[0].date, rising[rising.length - 1].date, 10000, 'monthly')
    expect(r.totalInvested).toBeCloseTo(10000, 2)
  })

  it('buys more units when prices are low — wins in volatile market', () => {
    const ls = runLumpSum(volatile, volatile[0].date, volatile[volatile.length - 1].date, 5000)
    const dca = runDca(volatile, volatile[0].date, volatile[volatile.length - 1].date, 5000, 'monthly')
    expect(dca.finalValue).toBeGreaterThan(ls.finalValue)
  })

  it('monthly and weekly produce same final value with monthly data', () => {
    const monthly = runDca(rising, rising[0].date, rising[rising.length - 1].date, 10000, 'monthly')
    const weekly = runDca(rising, rising[0].date, rising[rising.length - 1].date, 10000, 'weekly')
    expect(monthly.finalValue).toBeCloseTo(weekly.finalValue, 2)
  })
})

describe('compareStrategies', () => {
  it('identifies lump sum as winner in rising market', () => {
    const ls = runLumpSum(rising, rising[0].date, rising[rising.length - 1].date, 10000)
    const dca = runDca(rising, rising[0].date, rising[rising.length - 1].date, 10000, 'monthly')
    const c = compareStrategies(dca, ls)
    expect(c.winner).toBe('lumpSum')
    expect(c.diffAbsolute).toBeGreaterThan(0)
  })
})

describe('analyzeAllStartDates', () => {
  it('returns empty when dataset shorter than window', () => {
    const r = analyzeAllStartDates(volatile, 100, 10000, 'monthly')
    expect(r.totalPeriods).toBe(0)
    expect(r.distribution).toHaveLength(0)
  })

  it('win counts sum to totalPeriods', () => {
    const r = analyzeAllStartDates(rising, 12, 10000, 'monthly')
    expect(r.dcaWins + r.lumpSumWins + r.ties).toBe(r.totalPeriods)
  })

  it('lumpSum wins all periods in steadily rising market', () => {
    const r = analyzeAllStartDates(rising, 6, 10000, 'monthly')
    expect(r.lumpSumWins).toBe(r.totalPeriods)
    expect(r.dcaWins).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npx vitest run lib/calc/dca.test.ts
```

Expected: all fail with "Cannot find module './dca'".

- [ ] **Step 3: Create `lib/calc/dca.ts`**

```typescript
import type {
  DataPoint, StrategyResult, ComparisonResult,
  AllStartDatesAnalysis, StartDateDistributionEntry,
} from '@/types'
import { calcCAGR } from './historical'

export function runLumpSum(
  data: DataPoint[],
  startDate: string,
  endDate: string,
  totalAmount: number,
): StrategyResult {
  const slice = data.filter(d => d.date >= startDate && d.date <= endDate)
  if (slice.length < 2) throw new Error('Not enough data in selected range')

  const units = totalAmount / slice[0].value
  const monthlyData: DataPoint[] = slice.map(d => ({ date: d.date, value: units * d.value }))
  const finalValue = units * slice[slice.length - 1].value
  const years = (slice.length - 1) / 12

  return {
    finalValue,
    totalInvested: totalAmount,
    totalReturn: (finalValue - totalAmount) / totalAmount,
    cagr: calcCAGR(slice[0].value, slice[slice.length - 1].value, years),
    monthlyData,
  }
}

export function runDca(
  data: DataPoint[],
  startDate: string,
  endDate: string,
  totalAmount: number,
  frequency: 'weekly' | 'monthly',
): StrategyResult {
  const slice = data.filter(d => d.date >= startDate && d.date <= endDate)
  if (slice.length < 2) throw new Error('Not enough data in selected range')

  // Data is monthly. Both frequencies execute monthly; 'weekly' is conceptually finer
  // but collapses to the same monthly cash flow given monthly data granularity.
  const numMonths = slice.length - 1
  const monthlyAmount = totalAmount / numMonths

  let units = 0
  const monthlyData: DataPoint[] = []

  for (let i = 0; i < slice.length - 1; i++) {
    units += monthlyAmount / slice[i].value
    monthlyData.push({ date: slice[i].date, value: units * slice[i].value })
  }
  monthlyData.push({ date: slice[slice.length - 1].date, value: units * slice[slice.length - 1].value })

  const finalValue = units * slice[slice.length - 1].value
  const years = numMonths / 12

  return {
    finalValue,
    totalInvested: totalAmount,
    totalReturn: (finalValue - totalAmount) / totalAmount,
    cagr: calcCAGR(slice[0].value, slice[slice.length - 1].value, years),
    monthlyData,
  }
}

export function compareStrategies(dca: StrategyResult, lumpSum: StrategyResult): ComparisonResult {
  const diffAbsolute = Math.abs(lumpSum.finalValue - dca.finalValue)
  const diffPercent = dca.totalInvested > 0 ? diffAbsolute / dca.totalInvested : 0

  let winner: 'dca' | 'lumpSum' | 'tie'
  if (diffAbsolute / (dca.totalInvested || 1) < 0.001) {
    winner = 'tie'
  } else if (dca.finalValue > lumpSum.finalValue) {
    winner = 'dca'
  } else {
    winner = 'lumpSum'
  }

  return { dca, lumpSum, winner, diffAbsolute, diffPercent }
}

export function analyzeAllStartDates(
  data: DataPoint[],
  windowMonths: number,
  totalAmount: number,
  frequency: 'weekly' | 'monthly',
): AllStartDatesAnalysis {
  if (data.length <= windowMonths) {
    return { totalPeriods: 0, dcaWins: 0, lumpSumWins: 0, ties: 0, dcaWinRate: 0, lumpSumWinRate: 0, distribution: [] }
  }

  const distribution: StartDateDistributionEntry[] = []
  let dcaWins = 0, lumpSumWins = 0, ties = 0

  for (let i = 0; i + windowMonths < data.length; i++) {
    const window = data.slice(i, i + windowMonths + 1)
    const startDate = window[0].date
    const endDate = window[window.length - 1].date

    const dca = runDca(data, startDate, endDate, totalAmount, frequency)
    const ls = runLumpSum(data, startDate, endDate, totalAmount)

    let winner: 'dca' | 'lumpSum' | 'tie'
    if (Math.abs(dca.finalValue - ls.finalValue) / totalAmount < 0.001) {
      winner = 'tie'; ties++
    } else if (dca.finalValue > ls.finalValue) {
      winner = 'dca'; dcaWins++
    } else {
      winner = 'lumpSum'; lumpSumWins++
    }

    distribution.push({ startDate, dcaFinalValue: dca.finalValue, lumpSumFinalValue: ls.finalValue, winner })
  }

  const totalPeriods = distribution.length
  return {
    totalPeriods, dcaWins, lumpSumWins, ties,
    dcaWinRate: totalPeriods > 0 ? dcaWins / totalPeriods : 0,
    lumpSumWinRate: totalPeriods > 0 ? lumpSumWins / totalPeriods : 0,
    distribution,
  }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npx vitest run lib/calc/dca.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add lib/calc/dca.ts lib/calc/dca.test.ts
git commit -m "feat: add DCA vs lump sum calc functions with tests"
```

---

## Task 5: Shared historical components (AssetPicker + MonthYearRangePicker)

**Files:**
- Create: `components/historical/AssetPicker.tsx`
- Create: `components/historical/MonthYearRangePicker.tsx`

- [ ] **Step 1: Create `components/historical/AssetPicker.tsx`**

```tsx
'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ASSET_LABELS, type AssetKey } from '@/types'

interface Props {
  value: AssetKey
  onChange: (v: AssetKey) => void
}

export function AssetPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Asset</label>
      <Select value={value} onValueChange={v => onChange(v as AssetKey)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(ASSET_LABELS) as [AssetKey, string][]).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/historical/MonthYearRangePicker.tsx`**

```tsx
'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MONTHS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' }, { value: '04', label: 'Apr' },
  { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' }, { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
]

interface Props {
  startDate: string   // "YYYY-MM-DD"
  endDate: string
  minDate: string
  maxDate: string
  onChange: (start: string, end: string) => void
}

export function MonthYearRangePicker({ startDate, endDate, minDate, maxDate, onChange }: Props) {
  const minYear = parseInt(minDate.substring(0, 4))
  const maxYear = parseInt(maxDate.substring(0, 4))
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i))

  const startYear = startDate.substring(0, 4)
  const startMonth = startDate.substring(5, 7)
  const endYear = endDate.substring(0, 4)
  const endMonth = endDate.substring(5, 7)

  function update(field: 'sy' | 'sm' | 'ey' | 'em', val: string) {
    const sy = field === 'sy' ? val : startYear
    const sm = field === 'sm' ? val : startMonth
    const ey = field === 'ey' ? val : endYear
    const em = field === 'em' ? val : endMonth
    onChange(`${sy}-${sm}-01`, `${ey}-${em}-01`)
  }

  const invalid = startDate >= endDate

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Date Range</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Select value={startMonth} onValueChange={v => update('sm', v)}>
            <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={startYear} onValueChange={v => update('sy', v)}>
            <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground text-sm">→</span>
        <div className="flex gap-1">
          <Select value={endMonth} onValueChange={v => update('em', v)}>
            <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={endYear} onValueChange={v => update('ey', v)}>
            <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {invalid && <p className="text-sm text-destructive">Start date must be before end date.</p>}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/historical/AssetPicker.tsx components/historical/MonthYearRangePicker.tsx
git commit -m "feat: add AssetPicker and MonthYearRangePicker components"
```

---

## Task 6: DrawdownChart component

**Files:**
- Create: `components/historical/DrawdownChart.tsx`

- [ ] **Step 1: Create `components/historical/DrawdownChart.tsx`**

```tsx
'use client'
import { useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts'
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
          <Tooltip formatter={(v: number) => [`$${formatCompact(v)}`]} labelFormatter={l => String(l)} />
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
        <Tooltip formatter={(v: number) => [`$${formatCompact(v)}`, 'Portfolio']} labelFormatter={l => String(l)} />
        {drawdowns.map((d, i) => (
          <ReferenceArea key={i} x1={d.startDate} x2={d.endDate} fill="hsl(var(--destructive))" fillOpacity={0.15} />
        ))}
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#areaGrad)" dot={false} isAnimationActive={!noAnim} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/historical/DrawdownChart.tsx
git commit -m "feat: add DrawdownChart with single-area and dual-line modes"
```

---

## Task 7: HistoricalResultCard + YearlyReturnsTable + WinRateHistogram

**Files:**
- Create: `components/historical/HistoricalResultCard.tsx`
- Create: `components/historical/YearlyReturnsTable.tsx`
- Create: `components/historical/WinRateHistogram.tsx`

- [ ] **Step 1: Create `components/historical/HistoricalResultCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `components/historical/YearlyReturnsTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { formatCurrency } from '@/lib/format/currency'
import { formatNumber } from '@/lib/format/number'
import { CURRENCY_LOCALES, type YearlyReturnRow } from '@/types'

interface Props { rows: YearlyReturnRow[] }

export function YearlyReturnsTable({ rows }: Props) {
  const [open, setOpen] = useState(false)
  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)} className="mb-3">
        Year-by-year returns
        {open ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
      {open && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Year', 'Start', 'End', 'Return'].map(h => (
                  <th key={h} className={`px-4 py-2 font-medium ${h === 'Year' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.year} className="border-t">
                  <td className="px-4 py-2">{row.year}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(row.startValue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(row.endValue)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${row.annualReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                    {row.annualReturn >= 0 ? '+' : ''}{formatNumber(row.annualReturn * 100, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/historical/WinRateHistogram.tsx`**

```tsx
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
          <YAxis tickFormatter={v => `$${formatCompact(Math.abs(v))}`} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [
              `$${formatCompact(Math.abs(v))}`,
              v >= 0 ? 'Lump sum advantage' : 'DCA advantage',
            ]}
            labelFormatter={l => `Start: ${l}`}
          />
          <Bar dataKey="diff" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.winner === 'lumpSum'
                    ? 'hsl(var(--chart-2))'
                    : entry.winner === 'dca'
                    ? 'hsl(var(--chart-1))'
                    : 'hsl(var(--muted-foreground))'
                }
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(var(--chart-2))]" />
          Lump sum wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(var(--chart-1))]" />
          DCA wins
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/historical/
git commit -m "feat: add HistoricalResultCard, YearlyReturnsTable, WinRateHistogram"
```

---

## Task 8: Historical Simulator page

**Files:**
- Create: `app/(tools)/historical-simulator/HistoricalSimulator.tsx`
- Modify: `app/(tools)/historical-simulator/page.tsx`

- [ ] **Step 1: Create `app/(tools)/historical-simulator/HistoricalSimulator.tsx`**

```tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
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

const DEFAULT_START = '1994-01-01'
const DEFAULT_END = '2024-01-01'

const schema = z.object({
  asset: z.enum(['sp500', 'bitcoin', 'gold', 'treasury10y']).default('sp500'),
  start: z.string().default(DEFAULT_START),
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

  const [data, setData] = useState<DataPoint[] | null>(null)
  const [meta, setMeta] = useState<AssetMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    Promise.all([
      fetch(ASSET_DATA_FILES[asset]).then(r => r.json() as Promise<DataPoint[]>),
      fetch(ASSET_META_FILES[asset]).then(r => r.json() as Promise<AssetMeta>),
    ])
      .then(([d, m]) => { setData(d); setMeta(m) })
      .catch(() => setFetchError('Failed to load asset data. Please try again.'))
      .finally(() => setLoading(false))
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
    setAsset(a)
    setStartDate(DEFAULT_START)
    setEndDate(DEFAULT_END)
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
```

- [ ] **Step 2: Replace `app/(tools)/historical-simulator/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { HistoricalSimulator } from './HistoricalSimulator'

export const metadata: Metadata = {
  title: 'Historical Investment Simulator — FinSight',
  description:
    'See what a past investment in the S&P 500, Bitcoin, Gold, or US Treasuries would be worth today. Real historical data, no signup required.',
}

export default function HistoricalSimulatorPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Historical Investment Simulator
      </h1>
      <p className="mb-8 text-muted-foreground">
        See what a past investment would be worth today using real historical data.
      </p>
      <HistoricalSimulator />
    </main>
  )
}
```

- [ ] **Step 3: Start the dev server and open `/historical-simulator`**

```bash
npm run dev
```

Open `http://localhost:3000/historical-simulator`. Verify:
- Asset picker shows all 4 options
- Date pickers are bounded to the asset's data range
- Changing inputs updates the result card and chart
- Drawdown shading appears on the chart
- Year-by-year table toggles open/closed
- Share button copies a URL with all params

- [ ] **Step 4: Commit**

```bash
git add app/\(tools\)/historical-simulator/
git commit -m "feat: build historical simulator page"
```

---

## Task 9: DCA vs Lump Sum page

**Files:**
- Create: `app/(tools)/dca-vs-lump-sum/DcaVsLumpSum.tsx`
- Modify: `app/(tools)/dca-vs-lump-sum/page.tsx`

- [ ] **Step 1: Create `app/(tools)/dca-vs-lump-sum/DcaVsLumpSum.tsx`**

```tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
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

const DEFAULT_START = '2004-01-01'
const DEFAULT_END = '2024-01-01'

const schema = z.object({
  asset: z.enum(['sp500', 'bitcoin', 'gold', 'treasury10y']).default('sp500'),
  start: z.string().default(DEFAULT_START),
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
    setAsset(urlState.asset); setStartDate(urlState.start); setEndDate(urlState.end)
    setAmount(urlState.amount); setFreq(urlState.freq); setShowHistogram(urlState.hist)
  }, [JSON.stringify(urlState)]) // eslint-disable-line react-hooks/exhaustive-deps

  const [data, setData] = useState<DataPoint[] | null>(null)
  const [meta, setMeta] = useState<AssetMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  useEffect(() => {
    setLoading(true); setFetchError(null)
    Promise.all([
      fetch(ASSET_DATA_FILES[asset]).then(r => r.json() as Promise<DataPoint[]>),
      fetch(ASSET_META_FILES[asset]).then(r => r.json() as Promise<AssetMeta>),
    ])
      .then(([d, m]) => { setData(d); setMeta(m) })
      .catch(() => setFetchError('Failed to load asset data. Please try again.'))
      .finally(() => setLoading(false))
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
    setAsset(a); setStartDate(DEFAULT_START); setEndDate(DEFAULT_END)
  }

  const winnerLabel =
    comparison?.winner === 'tie'
      ? 'Both strategies performed equally.'
      : comparison
      ? `${comparison.winner === 'lumpSum' ? 'Lump sum' : 'DCA'} wins by ${fmt(comparison.diffAbsolute)} (${formatNumber(comparison.diffPercent * 100, 1)}% of invested capital)`
      : ''

  return (
    <div className="space-y-6">
      {/* Inputs */}
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

      {!loading && comparison && (
        <>
          <div className="flex justify-end"><ShareButton /></div>

          {/* Comparison result */}
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

          {/* Overlaid chart */}
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

          {/* Histogram toggle */}
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
```

- [ ] **Step 2: Replace `app/(tools)/dca-vs-lump-sum/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { DcaVsLumpSum } from './DcaVsLumpSum'

export const metadata: Metadata = {
  title: 'DCA vs Lump Sum Calculator — FinSight',
  description:
    'Compare dollar-cost averaging against lump sum investing using real historical market data. See which strategy wins across every historical window.',
}

export default function DcaVsLumpSumPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">DCA vs Lump Sum</h1>
      <p className="mb-8 text-muted-foreground">
        Compare strategies on real historical data. Which approach would have come out ahead?
      </p>
      <DcaVsLumpSum />
    </main>
  )
}
```

- [ ] **Step 3: Open `/dca-vs-lump-sum` and verify**

With dev server running, open `http://localhost:3000/dca-vs-lump-sum`. Check:
- Both strategies show final values and CAGR
- Winner text is correct
- Overlaid chart shows two distinct colored lines with a legend
- "Show all historical start dates" toggle reveals the histogram
- Histogram bars are green (lump sum wins) or blue (DCA wins)
- Win rate summary text is accurate
- Share button works

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/\(tools\)/dca-vs-lump-sum/
git commit -m "feat: build DCA vs lump sum page with histogram"
```

---

## Self-review checklist

After all tasks are complete, verify against the spec:

- [ ] `scripts/fetch-historical-data.ts` runs cleanly and produces 8 files in `public/data/`
- [ ] All 4 assets load and render without console errors
- [ ] Changing asset resets date bounds to match that asset's data range
- [ ] `runSimulation` with monthly contributions: `totalInvested = initialInvestment + (months × pmt)`
- [ ] Drawdown shading appears on the chart for volatile assets (e.g. Bitcoin)
- [ ] Year-by-year table collapses on mobile
- [ ] URL params round-trip: copy URL, paste in new tab, same result renders
- [ ] `analyzeAllStartDates` histogram renders for the full S&P 500 dataset without freezing the UI
- [ ] All Vitest tests pass: `npx vitest run`
- [ ] TypeScript clean: `npx tsc --noEmit`
