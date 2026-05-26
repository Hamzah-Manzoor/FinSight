import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, BarChart2, ArrowUpDown, Target } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { JsonLd } from '@/components/shared/JsonLd'
import { cn } from '@/lib/utils'

const TITLE = 'FinSight — Free Investment Calculators'
const DESCRIPTION =
  'Understand compound interest, explore historical returns, compare DCA vs lump sum, and plan your savings goals. Free, private, no signup.'

function ogImage(title: string) {
  return [{ url: `/api/og?title=${encodeURIComponent(title)}`, width: 1200, height: 630, alt: title }]
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
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

const TOOLS = [
  {
    icon: TrendingUp,
    title: 'Compound Interest Calculator',
    description:
      'See how your money grows over time with the power of compounding returns.',
    href: '/compound-interest-calculator',
  },
  {
    icon: BarChart2,
    title: 'Historical Simulator',
    description:
      'Explore what a past investment in the S&P 500, Bitcoin, Gold, or Treasuries would be worth today.',
    href: '/historical-simulator',
  },
  {
    icon: ArrowUpDown,
    title: 'DCA vs Lump Sum',
    description:
      'Compare dollar-cost averaging against lump sum investing on real historical data.',
    href: '/dca-vs-lump-sum',
  },
  {
    icon: Target,
    title: 'Savings Goal Calculator',
    description:
      'Work backwards from your target — find the monthly contribution you need to get there.',
    href: '/savings-goal-calculator',
  },
]

export default function HomePage() {
  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'FinSight',
          description: DESCRIPTION,
          url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Understand your money.{' '}
          <span className="text-emerald-600 dark:text-emerald-400">
            Plan your future.
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
          Free investment calculators. No signup, no ads, no data collection.
          Just honest math.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/compound-interest-calculator"
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            Try the Calculator
          </Link>
          <Link
            href="/historical-simulator"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            Explore Historical Data
          </Link>
        </div>
      </section>

      {/* Tools grid */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
          Tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map(({ icon: Icon, title, description, href }) => (
            <Link key={href} href={href} className="group block">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-md">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
