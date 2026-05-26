import type { Metadata } from 'next'
import { CompoundCalculator } from './CompoundCalculator'
import { JsonLd } from '@/components/shared/JsonLd'

const TITLE = 'Compound Interest Calculator'
const DESCRIPTION =
  'See exactly how your investment grows over time. Adjust principal, monthly contributions, rate, and time horizon — results update instantly.'
const URL = '/compound-interest-calculator'

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

export default function CompoundInterestPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return (
    <main>
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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">
          Compound Interest Calculator
        </h1>
        <p className="mb-8 text-muted-foreground">
          Enter your numbers and watch your money grow.
        </p>
      </div>
      <CompoundCalculator />
    </main>
  )
}
