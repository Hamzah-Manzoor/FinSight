import type { Metadata } from 'next'
import { DcaVsLumpSum } from './DcaVsLumpSum'
import { JsonLd } from '@/components/shared/JsonLd'

const TITLE = 'DCA vs Lump Sum Calculator'
const DESCRIPTION =
  'Compare dollar-cost averaging against lump sum investing using real historical market data. See which strategy wins across every historical window.'
const URL = '/dca-vs-lump-sum'

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

export default function DcaVsLumpSumPage() {
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
      <h1 className="mb-2 text-3xl font-bold tracking-tight">DCA vs Lump Sum</h1>
      <p className="mb-8 text-muted-foreground">
        Compare strategies on real historical data. Which approach would have come out ahead?
      </p>
      <DcaVsLumpSum />
    </main>
  )
}
