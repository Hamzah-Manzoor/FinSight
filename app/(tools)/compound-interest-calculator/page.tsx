import type { Metadata } from 'next'
import { CompoundCalculator } from './CompoundCalculator'

export const metadata: Metadata = {
  title: 'Compound Interest Calculator — FinSight',
  description:
    'See exactly how your investment grows over time. Adjust principal, monthly contributions, rate, and time horizon — results update instantly.',
}

export default function CompoundInterestPage() {
  return (
    <main>
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
