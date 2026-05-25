'use client'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { BookmarkIcon, ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ModeToggle, type CalcMode } from '@/components/calculator/ModeToggle'
import type { CalculatorParams } from '@/lib/schema/calculator'

interface InputPanelProps {
  form: UseFormReturn<CalculatorParams>
  onOpenSaved: () => void
  solvedPmt?: number | null
  solvedMonths?: number | null
}

interface FieldProps {
  label: string
  id: string
  hint?: string
  error?: string
  children: React.ReactNode
}

function Field({ label, id, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <span className="text-xs text-muted-foreground">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </span>
      )}
    </div>
  )
}

function NumberInput({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      className="h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none ring-1 ring-foreground/10 focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
      {...props}
    />
  )
}

function SolvedDisplay({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="h-10 w-full rounded-lg border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-600/20 flex items-center">
        {value ?? '—'}
      </div>
      <span className="text-xs text-muted-foreground">Calculated result</span>
    </div>
  )
}

function formatSolvedPmt(pmt: number | null | undefined): string | null {
  if (pmt == null) return null
  if (pmt < 0) return 'Already funded'
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(pmt)
}

function formatSolvedMonths(months: number | null | undefined): string | null {
  if (months == null) return null
  if (!Number.isFinite(months)) return 'Never'
  const years = Math.floor(months / 12)
  const rem = Math.round(months % 12)
  if (rem === 0) return `${years} yr`
  return `${years} yr ${rem} mo`
}

const FREQ_OPTIONS = [
  { value: '12', label: 'Monthly' },
  { value: '4', label: 'Quarterly' },
  { value: '1', label: 'Annually' },
  { value: '365', label: 'Daily' },
]

export function InputPanel({ form, onOpenSaved, solvedPmt, solvedMonths }: InputPanelProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form

  const inflationOn = watch('inflOn')
  const mode = watch('mode') as CalcMode
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 ring-1 ring-foreground/10">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Calculator</h2>
        <Button variant="ghost" size="sm" onClick={onOpenSaved}>
          <BookmarkIcon className="mr-1.5 size-3.5" />
          Saved
        </Button>
      </div>

      {/* Mode toggle */}
      <Controller
        control={control}
        name="mode"
        render={({ field }) => (
          <ModeToggle
            value={field.value as CalcMode}
            onChange={(m) => field.onChange(m)}
          />
        )}
      />

      <Separator />

      {/* Target amount — shown in pmt and time modes */}
      {mode !== 'fv' && (
        <Field label="Goal Amount" id="target" hint="The future value you want to reach" error={errors.target?.message}>
          <NumberInput id="target" min={0} step={1000} {...register('target', { valueAsNumber: true })} />
        </Field>
      )}

      <Field label="Initial Investment" id="p" error={errors.p?.message}>
        <NumberInput id="p" min={0} step={100} {...register('p', { valueAsNumber: true })} />
      </Field>

      {/* Monthly Contribution — normal input in fv/time modes, solved display in pmt mode */}
      {mode === 'pmt' ? (
        <SolvedDisplay label="Monthly Contribution" value={formatSolvedPmt(solvedPmt)} />
      ) : (
        <Field label="Monthly Contribution" id="pmt" error={errors.pmt?.message}>
          <NumberInput id="pmt" min={0} step={50} {...register('pmt', { valueAsNumber: true })} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Annual Return (%)" id="r" hint="Negative values allowed" error={errors.r?.message}>
          <NumberInput id="r" step={0.1} {...register('r', { valueAsNumber: true })} />
        </Field>
        {/* Time Period — normal input in fv/pmt modes, solved display in time mode */}
        {mode === 'time' ? (
          <SolvedDisplay label="Time Period (years)" value={formatSolvedMonths(solvedMonths)} />
        ) : (
          <Field label="Time Period (years)" id="t" error={errors.t?.message}>
            <NumberInput id="t" min={1} max={100} step={1} {...register('t', { valueAsNumber: true })} />
          </Field>
        )}
      </div>

      <Field label="Compounding Frequency" id="freq" error={errors.freq?.message}>
        <Controller
          control={control}
          name="freq"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={v => field.onChange(Number(v))}
            >
              <SelectTrigger id="freq" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQ_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {/* Inflation toggle */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Inflation adjustment</p>
          <p className="text-xs text-muted-foreground">Show real (purchasing-power) value</p>
        </div>
        <Controller
          control={control}
          name="inflOn"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              aria-label="Toggle inflation adjustment"
            />
          )}
        />
      </div>

      {inflationOn && (
        <Field label="Annual Inflation Rate (%)" id="infl" error={errors.infl?.message}>
          <NumberInput id="infl" min={0} step={0.1} {...register('infl', { valueAsNumber: true })} />
        </Field>
      )}

      {/* Advanced options */}
      <Collapsible open={advancedOpen} onOpenChange={(open) => setAdvancedOpen(open)}>
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDownIcon
            className="size-3.5 transition-transform"
            style={{ transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Contribution timing</p>
              <p className="text-xs text-muted-foreground">
                {watch('timing') === 'start' ? 'Start of period' : 'End of period'}
              </p>
            </div>
            <Controller
              control={control}
              name="timing"
              render={({ field }) => (
                <Switch
                  checked={field.value === 'start'}
                  onCheckedChange={(checked) => field.onChange(checked ? 'start' : 'end')}
                  aria-label="Contribution timing: start vs end of period"
                />
              )}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
