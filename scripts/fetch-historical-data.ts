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
  let data: DataPoint[]
  let source: string
  try {
    data = await yahoo('^SP500TR')
    source = 'Yahoo Finance ^SP500TR (S&P 500 Total Return Index)'
  } catch (err) {
    console.warn(`^SP500TR failed (${(err as Error).message}), falling back to ^GSPC`)
    data = await yahoo('^GSPC')
    source = 'Yahoo Finance ^GSPC (S&P 500 Price Index) — fallback from ^SP500TR'
  }
  write('sp500', data, {
    source,
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
