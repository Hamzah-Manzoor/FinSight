# Phase 4 — Historical Simulator Design

**Date:** 2026-05-26  
**Branch:** phase-4-historical-simulator  
**Status:** Approved

---

## Overview

Phase 4 ships two new pages — `/historical-simulator` and `/dca-vs-lump-sum` — backed by static historical JSON data for four assets (S&P 500, Bitcoin, Gold, US 10Y Treasury). All computation is client-side. Data is downloaded once via a dev-time script and committed to the repo.

---

## 1. Data Pipeline

### Script

`scripts/fetch-historical-data.ts` — run once via `tsx`, output committed to `/public/data/`.

Responsibilities:
- Fetch raw data from public sources for each asset
- Normalize to `{ "date": "YYYY-MM-DD", "value": number }[]`
- Write `*.json` and `*.meta.json` to `/public/data/`

### Assets and Sources

| Asset | File | Source | Coverage |
|---|---|---|---|
| S&P 500 Total Return | `sp500.json` | Yale Shiller CAPE data (public CSV) | Monthly, from 1928 |
| Bitcoin | `bitcoin.json` | CoinGecko public API | Monthly closing prices, from 2010-07 |
| Gold | `gold.json` | LBMA London price CSV (World Gold Council) | Monthly, from 1968 |
| US 10Y Treasury | `treasury10y.json` | NYU Damodaran annual returns dataset | Monthly total return, from 1928 |

### Meta files

Each asset has a sibling `*.meta.json`:

```json
{
  "source": "<URL>",
  "license": "<license or 'public domain'>",
  "lastUpdated": "YYYY-MM-DD",
  "dateRange": { "min": "YYYY-MM-DD", "max": "YYYY-MM-DD" }
}
```

### Data format invariant

All JSON files: strictly typed `{ date: string; value: number }[]`, sorted ascending by date, no nulls or gaps (missing months filled with prior value or interpolated linearly).

---

## 2. Calculation Libraries

### `lib/calc/historical.ts`

Pure functions, fully unit-tested.

```typescript
interface DataPoint { date: string; value: number }

interface DrawdownPeriod {
  startDate: string
  endDate: string
  depth: number          // peak-to-trough as decimal, e.g. -0.34
  durationMonths: number
}

interface YearlyReturnRow {
  year: number
  startValue: number
  endValue: number
  annualReturn: number   // decimal
}

interface SimulationResult {
  finalValue: number
  totalInvested: number
  totalReturn: number    // decimal
  cagr: number           // decimal
  yearlyRows: YearlyReturnRow[]
  drawdowns: DrawdownPeriod[]
  worstDrawdown: DrawdownPeriod
}
```

Functions:
- `runSimulation(data, startDate, endDate, initialInvestment, monthlyContribution)` → `SimulationResult`
- `calcCAGR(startValue, endValue, years)` → number
- `calcDrawdowns(data)` → `DrawdownPeriod[]`
- `getDateRange(data)` → `{ min: string; max: string }`

Simulation logic: at each month, grow existing balance by that month's return, then add monthly contribution (end-of-period). Scale investment amounts by the index ratio (not absolute prices) so the result is return-based regardless of asset price magnitude.

### `lib/calc/dca.ts`

Pure functions, fully unit-tested.

```typescript
interface StrategyResult {
  finalValue: number
  totalInvested: number
  totalReturn: number   // decimal
  cagr: number
}

interface ComparisonResult {
  dca: StrategyResult
  lumpSum: StrategyResult
  winner: 'dca' | 'lumpSum' | 'tie'
  diffAbsolute: number
  diffPercent: number   // decimal
}

interface StartDateDistributionEntry {
  startDate: string
  dcaFinalValue: number
  lumpSumFinalValue: number
  winner: 'dca' | 'lumpSum' | 'tie'
}

interface AllStartDatesAnalysis {
  totalPeriods: number
  dcaWins: number
  lumpSumWins: number
  ties: number
  dcaWinRate: number       // decimal
  lumpSumWinRate: number   // decimal
  distribution: StartDateDistributionEntry[]
}
```

Functions:
- `runDca(data, startDate, endDate, totalAmount, frequency: 'weekly' | 'monthly')` → `StrategyResult`
  - Spreads `totalAmount` evenly across investment intervals over the period
  - Since all data files are monthly, "weekly" frequency divides `totalAmount` into `Math.round(totalMonths * 52/12)` equal installments but executes them monthly (4 weekly payments collapsed into one monthly investment). The total invested stays exactly `totalAmount`.
- `runLumpSum(data, startDate, endDate, totalAmount)` → `StrategyResult`
  - Invests full amount on first available data point at or after startDate
- `compareStrategies(dca, lumpSum)` → `ComparisonResult`
- `analyzeAllStartDates(data, windowMonths, totalAmount, frequency)` → `AllStartDatesAnalysis`
  - Slides a `windowMonths`-wide window across all valid start dates in the dataset
  - Runs both strategies for each window and tallies results

### Testing

Both libs get Vitest unit tests covering:
- Normal happy path (multi-year window, positive returns)
- Single-month window
- No data in selected range (should throw with descriptive error)
- Zero initial investment / zero monthly contribution
- Drawdown spanning the full window
- `analyzeAllStartDates` with a dataset shorter than `windowMonths` (returns empty distribution)

---

## 3. Components

All new components live in `components/historical/`. All are client components (`"use client"`), receive data as props, no internal data fetching.

### `AssetPicker.tsx`

A labeled `Select` (shadcn) with four options:
- S&P 500 (Total Return)
- Bitcoin
- Gold
- US 10Y Treasury

Emits `asset: 'sp500' | 'bitcoin' | 'gold' | 'treasury10y'` on change.

### `MonthYearRangePicker.tsx`

Two pairs of dropdowns (Month select + Year select) for start and end date.

- Year options bounded by the selected asset's `dateRange.min` / `dateRange.max`
- Month options filtered so start month cannot be ≥ end month in the same year
- Emits `{ startDate: string; endDate: string }` in `"YYYY-MM-DD"` format (always first of month)
- Shows inline error if start ≥ end

### `DrawdownChart.tsx`

Recharts `AreaChart`:
- Single area: portfolio value over time
- Drawdown periods rendered as `ReferenceArea` bands (muted red, low opacity)
- Touch-friendly `CustomTooltip` showing date + value
- Responsive via `ResponsiveContainer`
- Respects `prefers-reduced-motion` (no animation when set)
- Human-readable Y-axis labels (`$1.2M` not `1200000`) via existing `formatCompact` utility

For DCA vs lump sum: accepts two data series and renders two `Line` components on a `LineChart` instead of area.

### `HistoricalResultCard.tsx`

Screenshot-friendly summary card. Layout:

```
You invested $10,000          →   $87,432
                              Total Return: +774%  |  CAGR: 8.2%
Worst drawdown: -56.8% over 17 months
```

Displays currency-formatted values using the global `CurrencyContext`.

### `WinRateHistogram.tsx`

Recharts `BarChart`:
- One bar per historical start date in `distribution`
- Bar height = difference in final value between strategies
- Color: green when lump sum wins, blue when DCA wins, gray for tie
- Summary above chart: "Lump sum won X% of the time across Y periods"
- X-axis: start date labels (sampled — not every bar labeled to avoid crowding)

### `YearlyReturnsTable.tsx`

Collapsible table (reuses `Collapsible` pattern from `BreakdownTable`):
- Columns: Year | Start Value | End Value | Annual Return
- Annual return cell colored: green for positive, red for negative
- Collapsed by default on mobile, expanded on desktop

---

## 4. Pages

### `/historical-simulator`

**State**: asset, startDate, endDate, initialInvestment, monthlyContribution  
**URL sync**: `?asset=sp500&start=1990-01&end=2020-01&amount=10000&pmt=500` via `useUrlState` (debounced 300ms)

Layout (single column, `max-w-5xl`):

1. **Input card**
   - Row 1: `AssetPicker` | `MonthYearRangePicker`
   - Row 2: Initial Investment input | Monthly Contribution input (optional, defaults to 0)
2. **`HistoricalResultCard`** — final value, total return, CAGR, worst drawdown
3. **`DrawdownChart`** — full width
4. **`YearlyReturnsTable`** — collapsible on mobile
5. **`Disclaimer`** — footer

Share button copies URL. Defaults: S&P 500, start = 30 years ago, end = most recent data point, amount = $10,000, monthly contribution = $0.

### `/dca-vs-lump-sum`

**State**: asset, startDate, endDate, totalAmount, frequency, showHistogram  
**URL sync**: `?asset=sp500&start=1990-01&end=2020-01&amount=10000&freq=monthly&hist=0`

Layout:

1. **Input card**
   - Row 1: `AssetPicker` | `MonthYearRangePicker`
   - Row 2: Total Amount input | DCA Frequency select (Weekly / Monthly)
2. **Comparison result card** — "Lump sum: $X · DCA: $Y · [Winner] wins by $Z (P%)" + CAGR for each strategy
3. **Overlaid line chart** (`DrawdownChart` in two-series mode) — one line per strategy, legend below
4. **Toggle**: "Show all historical start dates" — reveals `WinRateHistogram` + win rate summary text
5. **`Disclaimer`** — footer

Defaults: S&P 500, last 20 years, $10,000, monthly.

---

## 5. Architecture Notes

- Historical JSON files are lazy-loaded per page (`fetch('/data/sp500.json')`) on asset change — not bundled into JS. Loading state shown while fetching.
- Meta JSON files loaded once per asset to populate `MonthYearRangePicker` bounds and the "Data updated" line.
- `analyzeAllStartDates` can be slow for large datasets and long windows. Run inside a `useMemo` with a loading indicator; if it blocks the main thread, move to a `Web Worker` in a follow-up.
- No new shadcn primitives needed beyond what's already installed (Select, Card, Collapsible, Switch for toggle).

---

## 6. File Additions Summary

```
scripts/
  fetch-historical-data.ts

public/data/
  sp500.json / sp500.meta.json
  bitcoin.json / bitcoin.meta.json
  gold.json / gold.meta.json
  treasury10y.json / treasury10y.meta.json

lib/calc/
  historical.ts
  historical.test.ts
  dca.ts
  dca.test.ts

components/historical/
  AssetPicker.tsx
  MonthYearRangePicker.tsx
  DrawdownChart.tsx
  HistoricalResultCard.tsx
  WinRateHistogram.tsx
  YearlyReturnsTable.tsx

app/(tools)/historical-simulator/
  HistoricalSimulator.tsx   (client component)
  page.tsx                  (updated)

app/(tools)/dca-vs-lump-sum/
  DcaVsLumpSum.tsx          (client component)
  page.tsx                  (updated)
```
