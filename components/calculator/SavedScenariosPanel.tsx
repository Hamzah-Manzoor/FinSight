'use client'
import { useState } from 'react'
import { Trash2Icon, DownloadIcon, BookmarkIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { SavedScenario } from '@/lib/hooks/useSavedScenarios'
import type { CalculatorParams } from '@/lib/schema/calculator'

interface SavedScenariosPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenarios: SavedScenario[]
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onRemove: (id: string) => void
}

function scenarioSummary(p: CalculatorParams): string {
  return `$${p.p.toLocaleString()} @ ${p.r}% for ${p.t}y`
}

export function SavedScenariosPanel({
  open,
  onOpenChange,
  scenarios,
  onSave,
  onLoad,
  onRemove,
}: SavedScenariosPanelProps) {
  const [name, setName] = useState('')

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    setName('')
    toast.success(`"${trimmed}" saved`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Saved Scenarios</SheetTitle>
          <SheetDescription>
            Save your current inputs and reload them later.
          </SheetDescription>
        </SheetHeader>

        {/* Save current */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-1 ring-foreground/10 focus:ring-2 focus:ring-emerald-600"
            aria-label="Scenario name"
            placeholder="Scenario name…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            <BookmarkIcon className="mr-1.5 size-3.5" />
            Save
          </Button>
        </div>

        {/* List */}
        {scenarios.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No saved scenarios yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {scenarios.map(s => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 ring-1 ring-foreground/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {scenarioSummary(s.params)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onLoad(s.id)}
                    title="Load scenario"
                  >
                    <DownloadIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(s.id)}
                    title="Delete scenario"
                  >
                    <Trash2Icon className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
