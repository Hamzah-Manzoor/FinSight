// types/index.ts

export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'PKR'
  | 'JPY'
  | 'CAD'
  | 'AUD'

export const SUPPORTED_CURRENCIES: Currency[] = [
  'USD', 'EUR', 'GBP', 'INR', 'PKR', 'JPY', 'CAD', 'AUD',
]

export const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  PKR: 'ur-PK',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  INR: 'Indian Rupee',
  PKR: 'Pakistani Rupee',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
}

// Maps navigator.language values to Currency codes for auto-detection
export const LOCALE_TO_CURRENCY: Record<string, Currency> = {
  'en-US': 'USD',
  'en-GB': 'GBP',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'es-ES': 'EUR',
  'ja-JP': 'JPY',
  'en-IN': 'INR',
  'hi-IN': 'INR',
  'ur-PK': 'PKR',
  'en-CA': 'CAD',
  'en-AU': 'AUD',
}

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
