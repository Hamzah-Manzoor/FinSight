import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { CurrencySelector } from './CurrencySelector'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          FinSight
        </Link>
        <div className="flex items-center gap-2">
          <CurrencySelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
