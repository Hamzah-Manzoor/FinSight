import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Historical Investment Simulator',
  description:
    'See what a past investment in the S&P 500, Bitcoin, Gold, or Treasuries would be worth today.',
}

export default function HistoricalSimulatorPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        Historical Investment Simulator
      </h1>
      <p className="text-muted-foreground">Coming in Phase 4.</p>
    </main>
  )
}
