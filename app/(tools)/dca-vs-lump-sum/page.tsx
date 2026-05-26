import type { Metadata } from 'next'
import { DcaVsLumpSum } from './DcaVsLumpSum'

export const metadata: Metadata = {
  title: 'DCA vs Lump Sum Calculator — FinSight',
  description:
    'Compare dollar-cost averaging against lump sum investing using real historical market data. See which strategy wins across every historical window.',
}

export default function DcaVsLumpSumPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">DCA vs Lump Sum</h1>
      <p className="mb-8 text-muted-foreground">
        Compare strategies on real historical data. Which approach would have come out ahead?
      </p>
      <DcaVsLumpSum />
    </main>
  )
}
