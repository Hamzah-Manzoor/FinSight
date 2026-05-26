import type { DataPoint, DrawdownPeriod, SimulationResult, YearlyReturnRow } from '@/types'

export function getDateRange(data: DataPoint[]): { min: string; max: string } {
  if (data.length === 0) throw new Error('Empty dataset')
  return { min: data[0].date, max: data[data.length - 1].date }
}

export function calcCAGR(startValue: number, endValue: number, years: number): number {
  if (years <= 0 || startValue <= 0) return 0
  return Math.pow(endValue / startValue, 1 / years) - 1
}

/**
 * Identifies drawdown periods (>5% depth) in a monthly-spaced DataPoint array.
 * durationMonths is measured peak-to-recovery, not peak-to-trough.
 */
export function calcDrawdowns(data: DataPoint[]): DrawdownPeriod[] {
  if (data.length < 2) return []

  const results: DrawdownPeriod[] = []
  let peakValue = data[0].value
  let peakIdx = 0
  let inDrawdown = false
  let troughValue = data[0].value

  for (let i = 1; i < data.length; i++) {
    const v = data[i].value
    if (peakValue <= 0) {
      if (v > 0) { peakValue = v; peakIdx = i; troughValue = v; inDrawdown = false }
      continue
    }
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

/**
 * Runs a historical portfolio simulation. Data must be sorted ascending and monthly-spaced;
 * duration and CAGR calculations assume one month between consecutive points.
 */
export function runSimulation(
  data: DataPoint[],
  startDate: string,
  endDate: string,
  initialInvestment: number,
  monthlyContribution: number,
): SimulationResult {
  // ISO-8601 YYYY-MM-DD strings sort lexicographically = chronologically
  const slice = data.filter(d => d.date >= startDate && d.date <= endDate)
  if (slice.length < 2) throw new Error('Not enough data in selected range')

  let balance = initialInvestment
  let totalInvested = initialInvestment
  const monthlyData: DataPoint[] = [{ date: slice[0].date, value: balance }]
  const yearlyRows: YearlyReturnRow[] = []
  let yearStartBalance = balance
  let yearStartIdx = 0

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
      const monthsInPeriod = i - yearStartIdx
      yearlyRows.push({
        year: currYear,
        startValue: yearStartBalance,
        endValue: balance,
        annualReturn: monthsInPeriod === 12
          ? (balance - yearStartBalance) / yearStartBalance
          : Math.pow(balance / yearStartBalance, 12 / monthsInPeriod) - 1,
      })
      yearStartBalance = balance
      yearStartIdx = i
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
    // Simple return on invested capital; overstates early contributions for multi-period DCA
    totalReturn: totalInvested > 0 ? (balance - totalInvested) / totalInvested : 0,
    cagr: calcCAGR(slice[0].value, slice[slice.length - 1].value, years),
    monthlyData,
    yearlyRows,
    drawdowns,
    worstDrawdown,
  }
}
