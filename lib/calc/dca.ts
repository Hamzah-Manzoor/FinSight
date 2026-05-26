import type {
  DataPoint, StrategyResult, ComparisonResult,
  AllStartDatesAnalysis, StartDateDistributionEntry,
} from '@/types'
import { calcCAGR } from './historical'

/**
 * Invests totalAmount as a lump sum on the first available date.
 * Data must be sorted ascending and monthly-spaced.
 */
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
    totalReturn: totalAmount > 0 ? (finalValue - totalAmount) / totalAmount : 0,
    cagr: calcCAGR(slice[0].value, slice[slice.length - 1].value, years),
    monthlyData,
  }
}

/**
 * Invests totalAmount evenly spread across the period, one installment per month.
 * 'weekly' and 'monthly' produce the same result with monthly data granularity.
 * Data must be sorted ascending and monthly-spaced.
 */
export function runDca(
  data: DataPoint[],
  startDate: string,
  endDate: string,
  totalAmount: number,
  frequency: 'weekly' | 'monthly',
): StrategyResult {
  const slice = data.filter(d => d.date >= startDate && d.date <= endDate)
  if (slice.length < 2) throw new Error('Not enough data in selected range')

  const numMonths = slice.length - 1
  // Both frequencies execute monthly (data is monthly).
  // 'weekly' is conceptually finer but collapses to the same monthly cash flow.
  const monthlyAmount = totalAmount / numMonths

  let units = 0
  const monthlyData: DataPoint[] = []

  for (let i = 0; i < slice.length - 1; i++) {
    units += monthlyAmount / slice[i].value
    monthlyData.push({ date: slice[i].date, value: units * slice[i].value })
  }
  // Last point: evaluation only, no new purchase
  monthlyData.push({ date: slice[slice.length - 1].date, value: units * slice[slice.length - 1].value })

  const finalValue = units * slice[slice.length - 1].value
  const years = numMonths / 12

  return {
    finalValue,
    totalInvested: totalAmount,
    totalReturn: totalAmount > 0 ? (finalValue - totalAmount) / totalAmount : 0,
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

/**
 * Slides a windowMonths-wide window across all valid start dates in the dataset,
 * runs both strategies for each window, and returns win/loss statistics.
 */
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
