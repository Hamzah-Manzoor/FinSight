import { formatCurrency } from '@/lib/format/currency'
import { cn } from '@/lib/utils'

interface ResultCardProps {
  finalBalance: number
  totalContributed: number
  interestEarned: number
  realBalance: number
  inflationOn: boolean
  currency: string
  locale: string
}

function StatBlock({
  label,
  value,
  subValue,
  subLabel,
  large,
  accent,
}: {
  label: string
  value: string
  subValue?: string
  subLabel?: string
  large?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'font-semibold tabular-nums tracking-tight',
          large ? 'text-3xl' : 'text-2xl',
          accent && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </span>
      {subValue && subLabel && (
        <span className="text-xs text-muted-foreground">
          {subLabel}: {subValue}
        </span>
      )}
    </div>
  )
}

export function ResultCard({
  finalBalance,
  totalContributed,
  interestEarned,
  realBalance,
  inflationOn,
  currency,
  locale,
}: ResultCardProps) {
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatBlock
        label="Final Balance"
        value={fmt(inflationOn ? realBalance : finalBalance)}
        subValue={inflationOn ? fmt(finalBalance) : undefined}
        subLabel={inflationOn ? 'Nominal' : undefined}
        large
        accent
      />
      <StatBlock
        label="Total Contributed"
        value={fmt(totalContributed)}
      />
      <StatBlock
        label="Interest Earned"
        value={fmt(interestEarned)}
      />
    </div>
  )
}
