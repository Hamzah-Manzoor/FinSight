import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DCA vs Lump Sum Calculator',
  description:
    'Compare dollar-cost averaging against lump sum investing on real historical data.',
}

export default function DcaVsLumpSumPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        DCA vs Lump Sum
      </h1>
      <p className="text-muted-foreground">Coming in Phase 4.</p>
    </main>
  )
}
