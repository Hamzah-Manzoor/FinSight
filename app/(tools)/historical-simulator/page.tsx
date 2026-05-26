import type { Metadata } from 'next'
import { HistoricalSimulator } from './HistoricalSimulator'
import { JsonLd } from '@/components/shared/JsonLd'

const TITLE = 'Historical Investment Simulator'
const DESCRIPTION =
  'See what a past investment in the S&P 500, Bitcoin, Gold, or US Treasuries would be worth today. Real historical data, no signup required.'
const URL = '/historical-simulator'

function ogImage(title: string) {
  return [{ url: `/api/og?title=${encodeURIComponent(title)}`, width: 1200, height: 630, alt: title }]
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'FinSight',
    type: 'website',
    images: ogImage(TITLE),
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ogImage(TITLE).map(i => i.url),
  },
}

export default function HistoricalSimulatorPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: TITLE,
          description: DESCRIPTION,
          url: `${siteUrl}${URL}`,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        Historical Investment Simulator
      </h1>
      <p className="mb-8 text-muted-foreground">
        See what a past investment would be worth today using real historical data.
      </p>
      <HistoricalSimulator />
    </main>
  )
}
