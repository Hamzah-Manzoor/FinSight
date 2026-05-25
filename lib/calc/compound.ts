// lib/calc/compound.ts

export type CompoundFreq = 1 | 4 | 12 | 365
export type ContributionTiming = 'end' | 'start'

export interface YearlyRow {
  year: number
  balance: number
  totalContributed: number
  interestEarned: number
}

/**
 * Converts an annual rate and compounding frequency to an effective monthly rate.
 * This lets us always work in monthly periods regardless of compounding frequency,
 * which matches the assumption that contributions are always monthly.
 */
function effectiveMonthlyRate(annualRate: number, freq: CompoundFreq): number {
  if (annualRate === 0) return 0
  return Math.pow(1 + annualRate / freq, freq / 12) - 1
}

/**
 * Calculates the future value of an investment.
 *
 * @param p - Initial principal (≥ 0)
 * @param pmt - Monthly contribution (≥ 0)
 * @param annualRate - Annual return rate as decimal (e.g. 0.07 for 7%). Negative allowed.
 * @param years - Investment horizon in years (> 0)
 * @param freq - Compounding frequency per year: 1 | 4 | 12 | 365
 * @param timing - Whether contributions occur at start or end of each period
 */
export function calcFV(
  p: number,
  pmt: number,
  annualRate: number,
  years: number,
  freq: CompoundFreq = 12,
  timing: ContributionTiming = 'end',
): number {
  const N = years * 12
  const i = effectiveMonthlyRate(annualRate, freq)

  if (i === 0) {
    return p + pmt * N
  }

  const growth = Math.pow(1 + i, N)
  const timingFactor = timing === 'start' ? 1 + i : 1
  return p * growth + pmt * timingFactor * ((growth - 1) / i)
}

/**
 * Solves for the monthly contribution required to reach a target future value.
 *
 * @param fv - Target future value
 * @param p - Initial principal
 * @param annualRate - Annual return rate as decimal
 * @param years - Investment horizon in years
 * @param freq - Compounding frequency per year
 */
export function calcPMT(
  fv: number,
  p: number,
  annualRate: number,
  years: number,
  freq: CompoundFreq = 12,
): number {
  const N = years * 12
  const i = effectiveMonthlyRate(annualRate, freq)

  if (i === 0) {
    return (fv - p) / N
  }

  const growth = Math.pow(1 + i, N)
  return ((fv - p * growth) * i) / (growth - 1)
}

/**
 * Solves for the number of months required to reach a target future value.
 *
 * When p === 0: closed-form solution.
 * When p > 0: binary search over [1, 1200] months with 0.01-month tolerance.
 *
 * @returns Number of months (not years)
 */
export function calcTime(
  fv: number,
  p: number,
  pmt: number,
  annualRate: number,
  freq: CompoundFreq = 12,
): number {
  const i = effectiveMonthlyRate(annualRate, freq)

  if (i === 0) {
    if (pmt <= 0) return Infinity
    return (fv - p) / pmt
  }

  if (p === 0) {
    return Math.log((fv * i) / pmt + 1) / Math.log(1 + i)
  }

  // Binary search for the P > 0 case (no closed form)
  let lo = 1
  let hi = 1200
  const tolerance = 0.01

  while (hi - lo > tolerance) {
    const mid = (lo + hi) / 2
    const computed = calcFV(p, pmt, annualRate, mid / 12, freq, 'end')
    if (computed < fv) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return (lo + hi) / 2
}

/**
 * Converts a nominal future value to its inflation-adjusted (real) equivalent.
 *
 * @param nominalFV - The nominal future value
 * @param annualInflation - Annual inflation rate as decimal (e.g. 0.025 for 2.5%)
 * @param years - Number of years
 */
export function calcRealValue(
  nominalFV: number,
  annualInflation: number,
  years: number,
): number {
  if (annualInflation === 0) return nominalFV
  return nominalFV / Math.pow(1 + annualInflation, years)
}

/**
 * Builds a year-by-year breakdown of balance, contributions, and interest.
 * Iterates month-by-month for accuracy, snapshots at year boundaries.
 */
export function buildYearlyBreakdown(
  p: number,
  pmt: number,
  annualRate: number,
  years: number,
  freq: CompoundFreq = 12,
  timing: ContributionTiming = 'end',
): YearlyRow[] {
  const i = effectiveMonthlyRate(annualRate, freq)
  const rows: YearlyRow[] = []
  let balance = p
  let totalContributed = p

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      if (timing === 'start') {
        balance += pmt
        totalContributed += pmt
      }
      balance = balance * (1 + i)
      if (timing === 'end') {
        balance += pmt
        totalContributed += pmt
      }
    }
    rows.push({
      year,
      balance,
      totalContributed,
      interestEarned: balance - totalContributed,
    })
  }

  return rows
}
