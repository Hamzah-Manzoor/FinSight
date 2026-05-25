'use client'
import { cn } from '@/lib/utils'

export type CalcMode = 'fv' | 'pmt' | 'time'

const MODES: { value: CalcMode; label: string; description: string }[] = [
  { value: 'fv',   label: 'Final Value',    description: 'Solve for final balance' },
  { value: 'pmt',  label: 'Monthly Saving', description: 'Solve for required contribution' },
  { value: 'time', label: 'Time to Goal',   description: 'Solve for years needed' },
]

interface ModeToggleProps {
  value: CalcMode
  onChange: (mode: CalcMode) => void
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Calculation mode"
      className="flex rounded-lg border bg-muted/40 p-1 gap-1"
    >
      {MODES.map(mode => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          aria-pressed={value === mode.value}
          title={mode.description}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
            value === mode.value
              ? 'bg-background text-foreground shadow-sm ring-1 ring-foreground/10'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
