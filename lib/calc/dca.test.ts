import { describe, it, expect } from 'vitest'
import { runLumpSum, runDca, compareStrategies, analyzeAllStartDates } from './dca'
import type { DataPoint } from '@/types'

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
