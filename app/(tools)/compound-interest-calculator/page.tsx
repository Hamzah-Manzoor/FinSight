import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compound Interest Calculator',
  description:
    'Calculate how your investments grow over time with compound interest.',
}

export default function CompoundInterestPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        Compound Interest Calculator
      </h1>
      <p className="text-muted-foreground">Coming in Phase 2.</p>
    </main>
  )
}
