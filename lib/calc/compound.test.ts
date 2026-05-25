import { describe, it, expect } from 'vitest'
import {
  calcFV,
  calcPMT,
  calcTime,
  calcRealValue,
  buildYearlyBreakdown,
} from './compound'

// Tolerance helper — financial results within $0.10
function close(a: number, b: number, tol = 0.1): boolean {
  return Math.abs(a - b) < tol
}

describe('calcFV', () => {
  it('computes FV with principal only (no contributions), annual compounding', () => {
    // P=1000, rate=10%, 1 year, annual compounding, no PMT
    // effectiveMonthlyRate = (1.10)^(1/12) - 1
    // FV = 1000 * (1.10)^1 = 1100.00 (by construction)
    const result = calcFV(1000, 0, 0.10, 1, 1, 'end')
    expect(close(result, 1100.0)).toBe(true)
  })

  it('computes FV with monthly contributions only, monthly compounding', () => {
    // P=0, PMT=100, rate=12%, 1 year, monthly compounding
    // i=0.01, N=12, FV = 100 * ((1.01)^12 - 1) / 0.01 ≈ 1268.25
    const result = calcFV(0, 100, 0.12, 1, 12, 'end')
    expect(close(result, 1268.25)).toBe(true)
  })

  it('start-of-period contributions are higher than end-of-period', () => {
    const endFV = calcFV(0, 100, 0.12, 1, 12, 'end')
    const startFV = calcFV(0, 100, 0.12, 1, 12, 'start')
    // Start-of-period FV = endFV * (1 + i) ≈ 1268.25 * 1.01 ≈ 1280.93
    expect(startFV).toBeGreaterThan(endFV)
    expect(close(startFV, 1280.93)).toBe(true)
  })

  it('returns correct FV with zero rate', () => {
    // P=1000, PMT=100, rate=0, 5 years → FV = 1000 + 100*60 = 7000
    const result = calcFV(1000, 100, 0, 5, 12, 'end')
    expect(close(result, 7000.0, 0.01)).toBe(true)
  })

  it('returns a smaller value with a negative rate (stress test)', () => {
    // P=10000, PMT=0, rate=-10%, 1 year, annual compounding
    // FV = 10000 * 0.90 = 9000
    const result = calcFV(10000, 0, -0.10, 1, 1, 'end')
    expect(close(result, 9000.0)).toBe(true)
  })

  it('handles a 100-year horizon without overflow or NaN', () => {
    const result = calcFV(1000, 100, 0.07, 100, 12, 'end')
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBeGreaterThan(1_000_000)
  })

  it('monthly contributions with annual compounding yield correct result', () => {
    const result = calcFV(0, 100, 0.10, 1, 1, 'end')
    expect(Number.isFinite(result)).toBe(true)
    const monthly = calcFV(0, 100, 0.10, 1, 12, 'end')
    expect(Math.abs(result - monthly)).toBeLessThan(50)
  })
})

describe('calcPMT', () => {
  it('solves for PMT given a known FV', () => {
    // FV=1268.25, P=0, rate=12%, 1yr, monthly compounding → should return ≈ 100
    const result = calcPMT(1268.25, 0, 0.12, 1, 12)
    expect(close(result, 100.0)).toBe(true)
  })

  it('inverse relationship: calcPMT then calcFV returns original FV', () => {
    const targetFV = 500000
    const p = 10000
    const rate = 0.07
    const years = 20
    const freq = 12

    const pmt = calcPMT(targetFV, p, rate, years, freq)
    const computedFV = calcFV(p, pmt, rate, years, freq, 'end')
    expect(close(computedFV, targetFV, 1.0)).toBe(true)
  })

  it('returns correct PMT when rate is zero', () => {
    // FV=7000, P=1000, rate=0, 5 years → PMT = (7000-1000)/60 ≈ 100
    const result = calcPMT(7000, 1000, 0, 5, 12)
    expect(close(result, 100.0, 0.01)).toBe(true)
  })
})

describe('calcTime', () => {
  it('solves for time (months) given a known FV with no principal', () => {
    // P=0, PMT=100, rate=12%, target=1268.25 → should return ≈ 12 months
    const result = calcTime(1268.25, 0, 100, 0.12, 12)
    expect(close(result, 12.0, 0.1)).toBe(true)
  })

  it('inverse relationship (P=0): calcTime then calcFV returns original FV', () => {
    const targetFV = 50000
    const pmt = 300
    const rate = 0.08
    const freq = 12

    const months = calcTime(targetFV, 0, pmt, rate, freq)
    const years = months / 12
    const computedFV = calcFV(0, pmt, rate, years, freq, 'end')
    expect(close(computedFV, targetFV, 1.0)).toBe(true)
  })

  it('inverse relationship (P>0, binary search): calcTime then calcFV returns original FV', () => {
    const targetFV = 200000
    const p = 5000
    const pmt = 400
    const rate = 0.07
    const freq = 12

    const months = calcTime(targetFV, p, pmt, rate, freq)
    const years = months / 12
    const computedFV = calcFV(p, pmt, rate, years, freq, 'end')
    expect(close(computedFV, targetFV, 5.0)).toBe(true)
  })
})

describe('calcRealValue', () => {
  it('applies inflation adjustment correctly', () => {
    // nominalFV=1000, inflation=2.5%, 10 years → realFV = 1000 / (1.025)^10 ≈ 781.20
    const result = calcRealValue(1000, 0.025, 10)
    expect(close(result, 781.2, 1.0)).toBe(true)
  })

  it('returns nominalFV when inflation is 0', () => {
    expect(calcRealValue(5000, 0, 10)).toBe(5000)
  })
})

describe('buildYearlyBreakdown', () => {
  it('returns one row per year', () => {
    const rows = buildYearlyBreakdown(0, 100, 0.12, 3, 12, 'end')
    expect(rows).toHaveLength(3)
    expect(rows[0].year).toBe(1)
    expect(rows[2].year).toBe(3)
  })

  it('year 1 balance matches calcFV for 1 year', () => {
    const fv = calcFV(0, 100, 0.12, 1, 12, 'end')
    const rows = buildYearlyBreakdown(0, 100, 0.12, 1, 12, 'end')
    expect(close(rows[0].balance, fv)).toBe(true)
  })

  it('interestEarned = balance - totalContributed', () => {
    const rows = buildYearlyBreakdown(1000, 100, 0.07, 5, 12, 'end')
    for (const row of rows) {
      expect(close(row.interestEarned, row.balance - row.totalContributed, 0.01)).toBe(true)
    }
  })

  it('totalContributed increases by PMT*12 each year', () => {
    const pmt = 200
    const rows = buildYearlyBreakdown(500, pmt, 0.06, 3, 12, 'end')
    expect(close(rows[0].totalContributed, 500 + pmt * 12, 0.01)).toBe(true)
    expect(close(rows[1].totalContributed, 500 + pmt * 24, 0.01)).toBe(true)
  })

  it('balance is monotonically increasing with positive rate and positive PMT', () => {
    const rows = buildYearlyBreakdown(1000, 100, 0.07, 10, 12, 'end')
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].balance).toBeGreaterThan(rows[i - 1].balance)
    }
  })
})
