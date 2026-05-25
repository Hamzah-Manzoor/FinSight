import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Savings Goal Calculator',
  description: 'Find the monthly contribution you need to reach your savings goal.',
}

export default function SavingsGoalPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        Savings Goal Calculator
      </h1>
      <p className="text-muted-foreground">Coming in Phase 2.</p>
    </main>
  )
}
