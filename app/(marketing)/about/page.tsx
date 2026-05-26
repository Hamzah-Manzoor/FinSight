import type { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import { JsonLd } from '@/components/shared/JsonLd'

const TITLE = 'About'
const DESCRIPTION =
  'How FinSight works: compound interest formulas, historical data sources, methodology, and disclaimers.'
const URL = '/about'

function ogImage(title: string) {
  return [{ url: `/api/og?title=${encodeURIComponent(title)}`, width: 1200, height: 630, alt: title }]
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: 'About FinSight',
    description: DESCRIPTION,
    url: URL,
    siteName: 'FinSight',
    type: 'website',
    images: ogImage('About FinSight'),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About FinSight',
    description: DESCRIPTION,
    images: ogImage('About FinSight').map(i => i.url),
  },
}

interface MetaFile {
  source: string
  license: string
  lastUpdated: string
  dateRange: { min: string; max: string }
  note?: string
}

function readMeta(filename: string): MetaFile {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'public/data', filename), 'utf-8')
  )
}

const DATA_SOURCES = [
  { asset: 'S&P 500 (Total Return)', ...readMeta('sp500.meta.json') },
  { asset: 'Bitcoin', ...readMeta('bitcoin.meta.json') },
  { asset: 'Gold', ...readMeta('gold.meta.json') },
  { asset: 'US 10Y Treasury', ...readMeta('treasury10y.meta.json') },
]

export default function AboutPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'FinSight — About',
          description: DESCRIPTION,
          url: `${siteUrl}${URL}`,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />

      <h1 className="mb-3 text-3xl font-bold tracking-tight">About FinSight</h1>
      <p className="mb-12 text-muted-foreground">
        FinSight is a free, open educational tool for understanding compounding,
        planning savings goals, and exploring historical investment data. No
        accounts, no ads, no data collection.
      </p>

      {/* Compound Interest */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Compound Interest
        </h2>
        <p className="mb-4 text-muted-foreground">
          The core calculation uses the future value of an annuity formula.
          Contributions are assumed to occur monthly regardless of the selected
          compounding frequency.
        </p>

        <h3 className="mb-2 text-base font-medium">Standard mode (solve for final value)</h3>
        <pre className="mb-6 overflow-x-auto rounded-lg bg-muted px-5 py-4 text-sm font-mono leading-relaxed">
{`FV = P × (1 + i)^N + PMT × ((1 + i)^N − 1) / i

where:
  P   = initial principal
  PMT = monthly contribution (end of period)
  i   = annual rate ÷ 12
  N   = years × 12

For start-of-period contributions (annuity due):
  FV_due = FV × (1 + i)`}
        </pre>

        <h3 className="mb-2 text-base font-medium">Goal mode — solve for monthly contribution</h3>
        <pre className="mb-6 overflow-x-auto rounded-lg bg-muted px-5 py-4 text-sm font-mono leading-relaxed">
{`PMT = (FV − P × (1 + i)^N) × i / ((1 + i)^N − 1)`}
        </pre>

        <h3 className="mb-2 text-base font-medium">Goal mode — solve for time</h3>
        <p className="mb-2 text-sm text-muted-foreground">
          When the initial principal is zero, a closed-form solution exists:
        </p>
        <pre className="mb-4 overflow-x-auto rounded-lg bg-muted px-5 py-4 text-sm font-mono leading-relaxed">
{`N = log(FV × i / PMT + 1) / log(1 + i)   [when P = 0]`}
        </pre>
        <p className="text-sm text-muted-foreground">
          When P &gt; 0 no closed form exists. FinSight uses binary search over
          N ∈ [1, 1200] months with a tolerance of 0.01 to find the solution
          numerically.
        </p>
      </section>

      {/* Inflation Adjustment */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Inflation Adjustment
        </h2>
        <p className="mb-4 text-muted-foreground">
          Toggle on the inflation input to convert nominal results to
          real (purchasing-power-adjusted) values.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted px-5 py-4 text-sm font-mono leading-relaxed">
{`realFV = nominalFV / (1 + inflationRate)^years`}
        </pre>
      </section>

      {/* Historical Data Sources */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Historical Data Sources
        </h2>
        <p className="mb-6 text-muted-foreground">
          Data is shipped as static JSON files built into the app. No external
          API calls are made at runtime.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Asset</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Date range</th>
                <th className="pb-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((ds) => (
                <tr key={ds.asset} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{ds.asset}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{ds.source}</td>
                  <td className="py-3 pr-4 text-muted-foreground tabular-nums">
                    {ds.dateRange.min.substring(0, 7)} –{' '}
                    {ds.dateRange.max.substring(0, 7)}
                  </td>
                  <td className="py-3 text-muted-foreground tabular-nums">
                    {ds.lastUpdated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {DATA_SOURCES.filter(ds => ds.note).map(ds => (
          <p key={ds.asset} className="mt-3 text-xs text-muted-foreground">
            <strong>{ds.asset}:</strong> {ds.note}
          </p>
        ))}
      </section>

      {/* DCA vs Lump Sum methodology */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          DCA vs Lump Sum Methodology
        </h2>
        <p className="mb-3 text-muted-foreground">
          <strong>Lump sum</strong> — the total amount is invested on the first
          day of the period and grows with the asset price index through the end
          date.
        </p>
        <p className="mb-3 text-muted-foreground">
          <strong>Dollar-cost averaging (DCA)</strong> — the total amount is
          divided into equal instalments and invested at each period boundary
          (monthly). Each instalment is valued at the asset price on that date.
        </p>
        <p className="text-muted-foreground">
          The "all historical windows" toggle reruns both strategies for every
          possible start date of the chosen window length and shows what
          percentage of the time each strategy produced a higher final value.
        </p>
      </section>

      {/* Currency */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Currency Display
        </h2>
        <p className="text-muted-foreground">
          The currency selector in the header changes the symbol shown next to
          monetary values (USD, EUR, GBP, INR, PKR, JPY, CAD, AUD). It is
          purely cosmetic — FinSight performs no foreign exchange conversion. All
          calculations are currency-agnostic; only the display formatting
          changes.
        </p>
      </section>

      {/* Disclaimer */}
      <section className="rounded-lg border bg-muted/50 px-6 py-5">
        <h2 className="mb-3 text-base font-semibold">Disclaimer</h2>
        <p className="text-sm text-muted-foreground">
          FinSight is an educational tool, not financial advice. Results are
          illustrative and based on the assumptions you enter. Past performance
          does not predict future results. Historical data may contain gaps or
          errors. Consult a qualified financial advisor before making investment
          decisions.
        </p>
      </section>
    </main>
  )
}
