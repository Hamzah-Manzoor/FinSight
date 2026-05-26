import type { Metadata } from 'next'
import { HistoricalSimulator } from './HistoricalSimulator'

export const metadata: Metadata = {
  title: 'Historical Investment Simulator — FinSight',
  description:
    'See what a past investment in the S&P 500, Bitcoin, Gold, or US Treasuries would be worth today. Real historical data, no signup required.',
}

export default function HistoricalSimulatorPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
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
