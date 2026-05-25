'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Controller } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calculatorSchema, type CalculatorParams } from '@/lib/schema/calculator'
import type { Scenario } from '@/lib/hooks/useScenarios'
import { cn } from '@/lib/utils'

interface ScenarioPanelProps {
  scenario: Scenario
  onRemove: () => void
  onParamsChange: (params: CalculatorParams) => void
  onRename: (name: string) => void
}

const FREQ_OPTIONS = [
  { value: '12', label: 'Monthly' },
  { value: '4', label: 'Quarterly' },
  { value: '1', label: 'Annually' },
  { value: '365', label: 'Daily' },
]

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function NumInput({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      className="h-9 w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none ring-1 ring-foreground/10 focus:ring-2 focus:ring-emerald-600"
      {...props}
    />
  )
}

function ScenarioPanel({ scenario, onRemove, onParamsChange, onRename }: ScenarioPanelProps) {
  const [open, setOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)

  const form = useForm<CalculatorParams, unknown, CalculatorParams>({
    resolver: zodResolver(calculatorSchema) as never,
    defaultValues: scenario.params,
  })

  const { register, control, watch } = form

  // Propagate changes up on every field change
  form.watch(data => {
    const result = calculatorSchema.safeParse(data)
    if (result.success) onParamsChange(result.data)
  })

  const colorStyle = { borderColor: scenario.color, '--scenario-color': scenario.color } as React.CSSProperties

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="rounded-xl border-2 bg-card p-4 ring-1 ring-foreground/5"
        style={colorStyle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-full flex-shrink-0"
              style={{ background: scenario.color }}
            />
            {editingName ? (
              <input
                autoFocus
                className="text-sm font-medium bg-transparent border-b border-current outline-none w-36"
                defaultValue={scenario.name}
                onBlur={e => { onRename(e.target.value || scenario.name); setEditingName(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onRename((e.target as HTMLInputElement).value || scenario.name); setEditingName(false) }
                  if (e.key === 'Escape') setEditingName(false)
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-sm font-medium hover:underline decoration-dotted"
                title="Click to rename"
              >
                {scenario.name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="size-7 p-0 text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${scenario.name}`}
            >
              <TrashIcon className="size-3.5" />
            </Button>
            <CollapsibleTrigger
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              <ChevronDownIcon
                className={cn('size-3.5 transition-transform', open && 'rotate-180')}
              />
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <Separator className="my-3" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Initial Investment" id={`${scenario.id}-p`}>
              <NumInput id={`${scenario.id}-p`} min={0} step={100} {...register('p', { valueAsNumber: true })} />
            </Field>
            <Field label="Monthly Contribution" id={`${scenario.id}-pmt`}>
              <NumInput id={`${scenario.id}-pmt`} min={0} step={50} {...register('pmt', { valueAsNumber: true })} />
            </Field>
            <Field label="Annual Return (%)" id={`${scenario.id}-r`}>
              <NumInput id={`${scenario.id}-r`} step={0.1} {...register('r', { valueAsNumber: true })} />
            </Field>
            <Field label="Years" id={`${scenario.id}-t`}>
              <NumInput id={`${scenario.id}-t`} min={1} max={100} step={1} {...register('t', { valueAsNumber: true })} />
            </Field>
            <div className="col-span-2">
              <Field label="Compounding Frequency" id={`${scenario.id}-freq`}>
                <Controller
                  control={control}
                  name="freq"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}>
                      <SelectTrigger id={`${scenario.id}-freq`} className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQ_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

interface ScenarioManagerProps {
  scenarios: Scenario[]
  canAdd: boolean
  onAdd: () => void
  onRemove: (id: string) => void
  onParamsChange: (id: string, params: CalculatorParams) => void
  onRename: (id: string, name: string) => void
}

export function ScenarioManager({
  scenarios,
  canAdd,
  onAdd,
  onRemove,
  onParamsChange,
  onRename,
}: ScenarioManagerProps) {
  return (
    <div className="flex flex-col gap-4">
      {scenarios.map(scenario => (
        <ScenarioPanel
          key={scenario.id}
          scenario={scenario}
          onRemove={() => onRemove(scenario.id)}
          onParamsChange={params => onParamsChange(scenario.id, params)}
          onRename={name => onRename(scenario.id, name)}
        />
      ))}
      {canAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="w-full border-dashed text-muted-foreground hover:text-foreground"
        >
          <PlusIcon className="mr-1.5 size-3.5" />
          Add Scenario {scenarios.length + 2 <= 3 ? `(${scenarios.length + 1}/3)` : ''}
        </Button>
      )}
    </div>
  )
}
