# Phase 5 — Launch Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete FinSight for public launch by building the About page, adding full SEO instrumentation (JSON-LD, OG images, sitemap), fixing accessibility gaps, and deploying to Vercel.

**Architecture:** Option A sequence — About page first (pure content, no dependencies), then SEO layer (JSON-LD component + dynamic OG image route + metadata on every page + sitemap/robots), then a11y fixes, then build verification, then Vercel deployment. All pages remain statically generated; OG images run on the edge runtime.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS, `next/og` (ImageResponse), `fs` for build-time meta.json reads, Vitest + @testing-library/react + happy-dom

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `app/api/og/route.tsx` | Edge route: returns 1200×630 OG image from `?title=` param |
| Create | `components/shared/JsonLd.tsx` | Renders `<script type="application/ld+json">` tag |
| Create | `components/shared/JsonLd.test.tsx` | Verifies script tag content |
| Create | `app/sitemap.test.ts` | Verifies all routes are present |
| Create | `.env.example` | Documents `NEXT_PUBLIC_SITE_URL` for contributors |
| Modify | `app/layout.tsx` | Add `metadataBase` |
| Modify | `app/(marketing)/about/page.tsx` | Full content: formulas, data sources, disclaimer |
| Modify | `app/(marketing)/page.tsx` | Add `openGraph`, `twitter`, `JsonLd` |
| Modify | `app/(tools)/compound-interest-calculator/page.tsx` | Add `openGraph`, `twitter`, `JsonLd` |
| Modify | `app/(tools)/historical-simulator/page.tsx` | Add `openGraph`, `twitter`, `JsonLd` |
| Modify | `app/(tools)/dca-vs-lump-sum/page.tsx` | Add `openGraph`, `twitter`, `JsonLd` |
| Modify | `app/sitemap.ts` | Return all 6 routes with priority + changeFrequency |
| Modify | `app/robots.ts` | Add sitemap URL via `NEXT_PUBLIC_SITE_URL` |
| Modify | `components/calculator/GrowthChart.tsx` | Wrap chart div with `aria-hidden="true"` |
| Modify | `components/historical/DrawdownChart.tsx` | Wrap ResponsiveContainer with `aria-hidden` div |
| Modify | `components/historical/WinRateHistogram.tsx` | Add `aria-hidden` + `prefers-reduced-motion` |

---

## Task 1: Create the feature branch

**Files:** none (git only)

- [ ] **Step 1: Create and switch to the branch**

```bash
git checkout -b phase-5-launch-prep
```

Expected output: `Switched to a new branch 'phase-5-launch-prep'`

- [ ] **Step 2: Verify you are on the new branch**

```bash
git branch --show-current
```

Expected output: `phase-5-launch-prep`

---

## Task 2: JsonLd shared component

**Files:**
- Create: `components/shared/JsonLd.tsx`
- Create: `components/shared/JsonLd.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/shared/JsonLd.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { JsonLd } from './JsonLd'

test('renders script tag with correct type', () => {
  const data = { '@type': 'WebApplication', name: 'FinSight' }
  const { container } = render(<JsonLd data={data} />)
  const script = container.querySelector('script[type="application/ld+json"]')
  expect(script).toBeTruthy()
})

test('serializes data as valid JSON', () => {
  const data = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'FinSight' }
  const { container } = render(<JsonLd data={data} />)
  const script = container.querySelector('script[type="application/ld+json"]')!
  expect(JSON.parse(script.innerHTML)).toEqual(data)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run components/shared/JsonLd.test.tsx
```

Expected: FAIL — `Cannot find module './JsonLd'`

- [ ] **Step 3: Implement the component**

Create `components/shared/JsonLd.tsx`:

```typescript
interface Props {
  data: Record<string, unknown>
}

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run components/shared/JsonLd.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/shared/JsonLd.tsx components/shared/JsonLd.test.tsx
git commit -m "feat: add JsonLd component for structured data"
```

---

## Task 3: Dynamic OG image route

**Files:**
- Create: `app/api/og/route.tsx`

- [ ] **Step 1: Create the route handler**

Create `app/api/og/route.tsx`:

```typescript
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') ?? 'FinSight — Investment Calculators'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          padding: '80px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '64px',
            display: 'flex',
            color: '#d1fae5',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}
        >
          FinSight
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: title.length > 40 ? '48px' : '60px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: '#a7f3d0',
              fontSize: '28px',
              fontWeight: 400,
            }}
          >
            Free investment calculators. No signup, no ads.
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

- [ ] **Step 2: Verify it renders in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/api/og?title=Compound+Interest+Calculator` in a browser. You should see a 1200×630 green-gradient image with "Compound Interest Calculator" as the title.

- [ ] **Step 3: Commit**

```bash
git add app/api/og/route.tsx
git commit -m "feat: add dynamic OG image route via next/og"
```

---

## Task 4: Add metadataBase to root layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `.env.example`

- [ ] **Step 1: Update the metadata export in `app/layout.tsx`**

Replace the existing `metadata` export (lines 19–26) with:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'FinSight — Investment Calculators',
    template: '%s | FinSight',
  },
  description:
    'Free investment calculators: compound interest, historical returns, DCA vs lump sum, and savings goal planning.',
}
```

- [ ] **Step 2: Create `.env.example`**

Create `.env.example` at the project root:

```bash
# Set this to your production domain after deploying to Vercel.
# Used to generate absolute sitemap URLs and OG image links.
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors)

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx .env.example
git commit -m "feat: add metadataBase and NEXT_PUBLIC_SITE_URL env var"
```

---

## Task 5: SEO metadata + JsonLd on all tool pages

**Files:**
- Modify: `app/(marketing)/page.tsx`
- Modify: `app/(tools)/compound-interest-calculator/page.tsx`
- Modify: `app/(tools)/historical-simulator/page.tsx`
- Modify: `app/(tools)/dca-vs-lump-sum/page.tsx`

A helper builds the OG image URL consistently. Add it once at the top of each file (not a shared module — keep each page file self-contained).

```typescript
function ogImage(title: string) {
  return [{ url: `/api/og?title=${encodeURIComponent(title)}`, width: 1200, height: 630, alt: title }]
}
```

The JSON-LD `WebApplication` schema used on every page:

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '<page title>',
  description: '<page description>',
  url: '<absolute URL>',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}
```

- [ ] **Step 1: Update `app/(marketing)/page.tsx`**

Replace the file content with:

```typescript
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
```

- [ ] **Step 2: Update `app/(tools)/compound-interest-calculator/page.tsx`**

Replace the file content with:

```typescript
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
```

- [ ] **Step 3: Update `app/(tools)/historical-simulator/page.tsx`**

Replace the file content with:

```typescript
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
```

- [ ] **Step 4: Update `app/(tools)/dca-vs-lump-sum/page.tsx`**

Replace the file content with:

```typescript
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
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors)

- [ ] **Step 6: Commit**

```bash
git add app/\(marketing\)/page.tsx \
        app/\(tools\)/compound-interest-calculator/page.tsx \
        app/\(tools\)/historical-simulator/page.tsx \
        app/\(tools\)/dca-vs-lump-sum/page.tsx
git commit -m "feat: add openGraph, twitter, and JSON-LD metadata to tool pages"
```

---

## Task 6: About page — full content

**Files:**
- Modify: `app/(marketing)/about/page.tsx`

- [ ] **Step 1: Replace the About page with full content**

Replace the entire file content with:

```typescript
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
```

- [ ] **Step 2: Start the dev server and verify the About page renders correctly**

```bash
npm run dev
```

Open `http://localhost:3000/about` and confirm:
- All five sections are visible: Compound Interest, Inflation Adjustment, Historical Data Sources, DCA vs Lump Sum Methodology, Currency Display, Disclaimer
- The data sources table shows all 4 assets with their correct date ranges and last-updated dates
- Formulas render in monospace blocks

- [ ] **Step 3: Commit**

```bash
git add app/\(marketing\)/about/page.tsx
git commit -m "feat: build full About page with formulas, data sources, and disclaimer"
```

---

## Task 7: Sitemap and robots

**Files:**
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`
- Create: `app/sitemap.test.ts`

- [ ] **Step 1: Write the failing sitemap test**

Create `app/sitemap.test.ts`:

```typescript
import sitemap from './sitemap'

test('sitemap contains all 6 routes', () => {
  const entries = sitemap()
  const paths = entries.map(e => new URL(e.url).pathname)
  expect(paths).toContain('/')
  expect(paths).toContain('/compound-interest-calculator')
  expect(paths).toContain('/savings-goal-calculator')
  expect(paths).toContain('/historical-simulator')
  expect(paths).toContain('/dca-vs-lump-sum')
  expect(paths).toContain('/about')
})

test('homepage has highest priority', () => {
  const entries = sitemap()
  const home = entries.find(e => new URL(e.url).pathname === '/')
  expect(home?.priority).toBe(1.0)
})

test('all entries have changeFrequency', () => {
  const entries = sitemap()
  for (const entry of entries) {
    expect(entry.changeFrequency).toBe('monthly')
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run app/sitemap.test.ts
```

Expected: FAIL — sitemap returns empty array

- [ ] **Step 3: Implement `app/sitemap.ts`**

Replace the file content with:

```typescript
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE}/compound-interest-calculator`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/savings-goal-calculator`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/historical-simulator`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/dca-vs-lump-sum`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/about`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run app/sitemap.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Update `app/robots.ts`**

Replace the file content with:

```typescript
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 7: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts app/robots.ts
git commit -m "feat: implement sitemap and robots with all routes"
```

---

## Task 8: Accessibility fixes

**Files:**
- Modify: `components/calculator/GrowthChart.tsx`
- Modify: `components/historical/DrawdownChart.tsx`
- Modify: `components/historical/WinRateHistogram.tsx`

All three charts already handle `prefers-reduced-motion` for animations. The remaining work is wrapping chart containers with `aria-hidden="true"` so screen readers skip the SVG noise, and adding `prefers-reduced-motion` to `WinRateHistogram` which currently lacks it.

- [ ] **Step 1: Update `components/calculator/GrowthChart.tsx`**

On line 94, change the outer `<div>` to include `aria-hidden="true"`:

```typescript
// old
<div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">

// new
<div aria-hidden="true" className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
```

- [ ] **Step 2: Update `components/historical/DrawdownChart.tsx`**

The component has two return branches. Wrap each `<ResponsiveContainer>` in an `aria-hidden` div.

**Dual mode branch** (currently line 69 — `return (<ResponsiveContainer ...>`):

```typescript
// old
return (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={chartData}>
      ...
    </LineChart>
  </ResponsiveContainer>
)

// new
return (
  <div aria-hidden="true">
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        ...
      </LineChart>
    </ResponsiveContainer>
  </div>
)
```

**Single mode branch** (currently line 87 — `return (<ResponsiveContainer ...>`):

```typescript
// old
return (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={chartData}>
      ...
    </AreaChart>
  </ResponsiveContainer>
)

// new
return (
  <div aria-hidden="true">
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        ...
      </AreaChart>
    </ResponsiveContainer>
  </div>
)
```

- [ ] **Step 3: Update `components/historical/WinRateHistogram.tsx`**

Add `prefers-reduced-motion` support and `aria-hidden` on the chart container.

Replace the file content with:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatNumber, formatCompact } from '@/lib/format/number'
import type { AllStartDatesAnalysis } from '@/types'

interface Props { analysis: AllStartDatesAnalysis }

export function WinRateHistogram({ analysis }: Props) {
  const { distribution, lumpSumWinRate, dcaWinRate, totalPeriods } = analysis

  const [noAnim, setNoAnim] = useState(false)
  useEffect(() => {
    setNoAnim(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const chartData = distribution.map(d => ({
    date: d.startDate.substring(0, 7),
    diff: d.lumpSumFinalValue - d.dcaFinalValue,
    winner: d.winner,
  }))

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Across <strong>{totalPeriods}</strong> historical periods —{' '}
        <strong>lump sum won {formatNumber(lumpSumWinRate * 100, 0)}%</strong> of the time
        {' · '}DCA won {formatNumber(dcaWinRate * 100, 0)}%
      </p>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickFormatter={v => `$${formatCompact(Math.abs(v as number))}`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: unknown) => {
                const num = typeof v === 'number' ? v : 0
                return [
                  `$${formatCompact(Math.abs(num))}`,
                  num >= 0 ? 'Lump sum advantage' : 'DCA advantage',
                ]
              }}
              labelFormatter={l => `Start: ${l}`}
            />
            <Bar dataKey="diff" radius={[2, 2, 0, 0]} isAnimationActive={!noAnim}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={
                    entry.winner === 'lumpSum'
                      ? '#22c55e'
                      : entry.winner === 'dca'
                      ? '#3b82f6'
                      : '#9ca3af'
                  }
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#22c55e' }} />
          Lump sum wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#3b82f6' }} />
          DCA wins
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 5: Commit**

```bash
git add components/calculator/GrowthChart.tsx \
        components/historical/DrawdownChart.tsx \
        components/historical/WinRateHistogram.tsx
git commit -m "fix: add aria-hidden to chart containers, add reduced-motion to WinRateHistogram"
```

---

## Task 9: Full test suite + production build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (no failures). If any test fails, fix it before continuing.

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: build completes with no errors. Look for any TypeScript or module resolution errors in the output. The `about` page SSG will call `readFileSync` — confirm no "file not found" errors appear.

- [ ] **Step 3: Preview the production build locally**

```bash
npm start
```

Open `http://localhost:3000` and spot-check each page:
- Landing page: loads, hero visible
- `/compound-interest-calculator`: calculator renders with default values
- `/historical-simulator`: asset picker and date range visible
- `/dca-vs-lump-sum`: strategy comparison renders
- `/about`: all sections present, data source table populated
- Right-click → View Page Source on any page: confirm `<script type="application/ld+json">` is present
- Open `http://localhost:3000/api/og?title=Test` in a browser: confirm OG image renders
- Open `http://localhost:3000/sitemap.xml`: confirm all 6 URLs appear

- [ ] **Step 4: Commit if any last-minute fixes were needed, otherwise just verify**

If all checks pass with no code changes, no commit needed. If you fixed anything, commit:

```bash
git add -p   # stage only what you changed
git commit -m "fix: <describe what you fixed>"
```

---

## Task 10: Vercel deployment

**Files:** none (CLI and dashboard operations)

- [ ] **Step 1: Install Vercel CLI**

```bash
npm i -g vercel
```

- [ ] **Step 2: Log in to Vercel**

```bash
vercel login
```

Follow the browser prompt to authenticate.

- [ ] **Step 3: Link and deploy a preview**

Run from the project root:

```bash
vercel
```

Vercel auto-detects Next.js. Accept the defaults. At the end it prints a preview URL (`https://<hash>.vercel.app`). Open it and confirm the site loads.

- [ ] **Step 4: Promote to production**

```bash
vercel --prod
```

This publishes to your project's production URL (`https://<project-name>.vercel.app`).

- [ ] **Step 5: Add the `NEXT_PUBLIC_SITE_URL` environment variable in the Vercel dashboard**

Go to: Vercel Dashboard → Project → Settings → Environment Variables

Add:
- Key: `NEXT_PUBLIC_SITE_URL`
- Value: `https://<project-name>.vercel.app` (or your custom domain if you have one)
- Environments: Production, Preview, Development

Then trigger a redeploy so the sitemap and robots.txt pick up the real URL:

```bash
vercel --prod
```

- [ ] **Step 6: Custom domain (do this whenever you purchase a domain)**

In Vercel Dashboard → Project → Settings → Domains:
1. Add your domain (e.g. `finsight.app`)
2. At your domain registrar, add:
   - `CNAME www → cname.vercel-dns.com`
   - `A @ → 76.76.19.61`
3. Wait for DNS propagation (usually < 5 minutes on Vercel)
4. Update `NEXT_PUBLIC_SITE_URL` to `https://your-domain.com` and redeploy

- [ ] **Step 7: Run Lighthouse on the production URL**

In Chrome, open each page and run Lighthouse (DevTools → Lighthouse tab → Analyze page load):

Pages to audit:
- `/` (Landing)
- `/compound-interest-calculator`
- `/historical-simulator`
- `/dca-vs-lump-sum`
- `/about`

Targets: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100

For any category below target:
- **Performance**: check for render-blocking resources, large images, unoptimized fonts
- **Accessibility**: follow the specific violations listed in the Lighthouse report — each has a direct fix
- **SEO**: usually a missing meta tag or malformed structured data — check with Google's Rich Results Test at `https://search.google.com/test/rich-results`

Fix, commit, and redeploy until all pages hit the targets.

- [ ] **Step 8: Final commit on the branch**

After all Lighthouse fixes are committed:

```bash
git log --oneline main..HEAD
```

Review the list of commits on this branch, then open a pull request to `main`.
