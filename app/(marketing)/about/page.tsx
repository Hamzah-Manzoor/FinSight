import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'Methodology, data sources, and disclaimers for FinSight.',
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">About FinSight</h1>
      <p className="text-muted-foreground">
        Methodology, formulas, and data sources — coming soon.
      </p>
    </main>
  )
}
