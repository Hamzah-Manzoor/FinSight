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
