# Phase 2 — Core Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fully interactive compound interest calculator page at `/compound-interest-calculator` with URL state sync, inflation toggle, saved scenarios, and share button.

**Architecture:** A single `useCalculatorState` hook composes form state (React Hook Form + Zod), URL sync (`useUrlState`), memoized calculations (`calcFV`, `buildYearlyBreakdown`), and localStorage CRUD (`useSavedScenarios`). The page component is thin — it wires the hook output to dumb presentational components. All heavy UI state logic lives in hooks, keeping components easy to read and test.

**Tech Stack:** Next.js 16 App Router, React Hook Form, Zod, Recharts (dynamic import), shadcn/ui (base-nova/Base UI), Vitest + happy-dom + @testing-library/react, Tailwind CSS v4.

---

## File Map

**New files (create):**
```
lib/schema/calculator.ts
lib/schema/calculator.test.ts
lib/hooks/useLocalStorage.ts
lib/hooks/useLocalStorage.test.ts
lib/hooks/useUrlState.ts
lib/hooks/useUrlState.test.ts
lib/hooks/useSavedScenarios.ts
lib/hooks/useSavedScenarios.test.ts
lib/hooks/useCalculatorState.ts
components/calculator/CalculatorShell.tsx
components/calculator/ResultCard.tsx
components/calculator/BreakdownTable.tsx
components/calculator/GrowthChart.tsx
components/calculator/ShareButton.tsx
components/calculator/SavedScenariosPanel.tsx
components/calculator/InputPanel.tsx
components/shared/Disclaimer.tsx
app/(tools)/compound-interest-calculator/CompoundCalculator.tsx
```

**Modified files:**
```
vitest.config.ts                                     ← change environment to happy-dom
app/(tools)/compound-interest-calculator/page.tsx    ← replace stub with real page
app/(tools)/savings-goal-calculator/page.tsx         ← replace stub with redirect
```

---

## Task 0: Create the phase-2 branch

**Files:** none

- [ ] **Step 1: Create and switch to the phase-2 branch**

```bash
git checkout -b phase-2-core-calculator
```

Expected: `Switched to a new branch 'phase-2-core-calculator'`

---

## Task 1: Install packages and configure test environment

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install zod react-hook-form @hookform/resolvers recharts
```

Expected: packages added under `"dependencies"` in package.json.

- [ ] **Step 2: Install test dependencies**

```bash
npm install -D happy-dom @testing-library/react @testing-library/user-event
```

Expected: packages added under `"devDependencies"`.

- [ ] **Step 3: Add shadcn components**

Run these one at a time (the CLI is interactive — accept defaults):

```bash
npx shadcn@latest add switch
npx shadcn@latest add separator
npx shadcn@latest add collapsible
npx shadcn@latest add sheet
npx shadcn@latest add sonner
```

Expected: new files appear under `components/ui/` for each component.

- [ ] **Step 4: Update vitest.config.ts to use happy-dom**

Replace the entire file content with:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 5: Verify existing tests still pass**

```bash
npm test
```

Expected: all existing compound.ts and format tests pass (pure math — environment doesn't affect them).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: install phase-2 deps, switch vitest to happy-dom"
```

---

## Task 2: Zod calculator schema

**Files:**
- Create: `lib/schema/calculator.ts`
- Create: `lib/schema/calculator.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/schema/calculator.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { calculatorSchema, defaultParams } from './calculator'

describe('calculatorSchema', () => {
  it('parses valid URL param strings into correct types', () => {
    const result = calculatorSchema.safeParse({
      p: '5000', pmt: '200', r: '6', t: '25',
      freq: '12', timing: 'end', infl: '3', inflOn: '1',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      p: 5000, pmt: 200, r: 6, t: 25,
      freq: 12, timing: 'end', infl: 3, inflOn: true,
    })
  })

  it('inflOn: "0" parses to false', () => {
    const result = calculatorSchema.safeParse({ inflOn: '0' })
    expect(result.success).toBe(true)
    expect(result.data?.inflOn).toBe(false)
  })

  it('inflOn: "1" parses to true', () => {
    const result = calculatorSchema.safeParse({ inflOn: '1' })
    expect(result.success).toBe(true)
    expect(result.data?.inflOn).toBe(true)
  })

  it('uses defaults when called with empty object', () => {
    const result = calculatorSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual(defaultParams)
  })

  it('rejects t > 100', () => {
    const result = calculatorSchema.safeParse({ t: '101' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid compounding frequency', () => {
    const result = calculatorSchema.safeParse({ freq: '7' })
    expect(result.success).toBe(false)
  })

  it('rejects negative principal', () => {
    const result = calculatorSchema.safeParse({ p: '-1' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/schema/calculator.test.ts
```

Expected: FAIL — `Cannot find module './calculator'`

- [ ] **Step 3: Create `lib/schema/calculator.ts`**

```typescript
import { z } from 'zod'

export const calculatorSchema = z.object({
  p:      z.coerce.number().min(0).default(10000),
  pmt:    z.coerce.number().min(0).default(500),
  r:      z.coerce.number().default(7),
  t:      z.coerce.number().min(1).max(100).default(30),
  freq:   z.coerce.number()
            .pipe(z.union([z.literal(1), z.literal(4), z.literal(12), z.literal(365)]))
            .default(12),
  timing: z.enum(['start', 'end']).default('end'),
  infl:   z.coerce.number().min(0).default(2.5),
  // Boolean URL params — "false" string is truthy so we cannot use z.coerce.boolean()
  inflOn: z.preprocess(v => v === '1' || v === true, z.boolean()).default(false),
})

export type CalculatorParams = z.infer<typeof calculatorSchema>

export const defaultParams: CalculatorParams = calculatorSchema.parse({})
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- lib/schema/calculator.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schema/calculator.ts lib/schema/calculator.test.ts
git commit -m "feat: add Zod calculator schema with URL param coercion"
```

---

## Task 3: useLocalStorage hook

**Files:**
- Create: `lib/hooks/useLocalStorage.ts`
- Create: `lib/hooks/useLocalStorage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/hooks/useLocalStorage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default value on first render when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42))
    expect(result.current[0]).toBe(42)
  })

  it('reads a previously stored value after hydration', async () => {
    localStorage.setItem('test-key', JSON.stringify(99))
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {})
    expect(result.current[0]).toBe(99)
  })

  it('writing a value updates state and localStorage', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {
      result.current[1](77)
    })
    expect(result.current[0]).toBe(77)
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(77)
  })

  it('accepts a function updater', async () => {
    localStorage.setItem('test-key', JSON.stringify(10))
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {})
    await act(async () => {
      result.current[1](prev => prev + 5)
    })
    expect(result.current[0]).toBe(15)
  })

  it('silently falls back to default when stored JSON is corrupt', async () => {
    localStorage.setItem('test-key', 'not-json{{')
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    await act(async () => {})
    expect(result.current[0]).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npm test -- lib/hooks/useLocalStorage.test.ts
```

Expected: FAIL — `Cannot find module './useLocalStorage'`

- [ ] **Step 3: Create `lib/hooks/useLocalStorage.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored) as T)
    } catch {
      // Corrupted storage — stay on defaultValue
    }
  }, [key])

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(prev => {
        const next =
          typeof newValue === 'function'
            ? (newValue as (p: T) => T)(prev)
            : newValue
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Private browsing or storage full — no-op
        }
        return next
      })
    },
    [key],
  )

  return [value, set]
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- lib/hooks/useLocalStorage.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useLocalStorage.ts lib/hooks/useLocalStorage.test.ts
git commit -m "feat: add useLocalStorage hook with SSR-safe hydration"
```

---

## Task 4: useUrlState hook

**Files:**
- Create: `lib/hooks/useUrlState.ts`
- Create: `lib/hooks/useUrlState.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/hooks/useUrlState.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUrlState } from './useUrlState'
import { calculatorSchema, defaultParams } from '@/lib/schema/calculator'

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useUrlState', () => {
  it('returns default params when URL has no search params', async () => {
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams),
    )
    await act(async () => {})
    expect(result.current[0]).toEqual(defaultParams)
  })

  it('parses URL params after hydration', async () => {
    window.history.replaceState({}, '', '?p=5000&pmt=200&r=6&t=20&freq=12&timing=end&infl=3&inflOn=1')
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams),
    )
    await act(async () => {})
    expect(result.current[0].p).toBe(5000)
    expect(result.current[0].r).toBe(6)
    expect(result.current[0].inflOn).toBe(true)
  })

  it('syncToUrl serializes boolean fields as 0/1', async () => {
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams),
    )
    await act(async () => {})
    act(() => {
      result.current[1]({ ...defaultParams, inflOn: true })
    })
    vi.runAllTimers()
    expect(window.location.search).toContain('inflOn=1')
  })

  it('syncToUrl debounces URL writes', async () => {
    const { result } = renderHook(() =>
      useUrlState(calculatorSchema, defaultParams, 300),
    )
    await act(async () => {})
    act(() => {
      result.current[1]({ ...defaultParams, p: 1000 })
      result.current[1]({ ...defaultParams, p: 2000 })
    })
    // URL not yet updated
    expect(window.location.search).not.toContain('p=')
    // Advance past debounce
    vi.advanceTimersByTime(300)
    expect(window.location.search).toContain('p=2000')
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npm test -- lib/hooks/useUrlState.test.ts
```

Expected: FAIL — `Cannot find module './useUrlState'`

- [ ] **Step 3: Create `lib/hooks/useUrlState.ts`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import type { z } from 'zod'

type AnyZodObject = z.ZodObject<z.ZodRawShape>

export function useUrlState<T extends AnyZodObject>(
  schema: T,
  defaults: z.infer<T>,
  debounceMs: number = 300,
): [z.infer<T>, (state: z.infer<T>) => void] {
  const [initialParams, setInitialParams] = useState<z.infer<T>>(defaults)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)

  // Parse URL once after mount (client-only — window is not available on server)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const raw = Object.fromEntries(new URLSearchParams(window.location.search))
    const parsed = schema.safeParse({ ...defaults, ...raw })
    if (parsed.success) setInitialParams(parsed.data)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const syncToUrl = useCallback(
    (newState: z.infer<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const sp = new URLSearchParams()
        for (const [k, v] of Object.entries(newState as Record<string, unknown>)) {
          if (v !== undefined && v !== null) {
            sp.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
          }
        }
        history.replaceState(null, '', `?${sp.toString()}`)
      }, debounceMs)
    },
    [debounceMs],
  )

  return [initialParams, syncToUrl]
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- lib/hooks/useUrlState.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useUrlState.ts lib/hooks/useUrlState.test.ts
git commit -m "feat: add useUrlState hook with Zod parsing and debounced URL sync"
```

---

## Task 5: useSavedScenarios hook

**Files:**
- Create: `lib/hooks/useSavedScenarios.ts`
- Create: `lib/hooks/useSavedScenarios.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/hooks/useSavedScenarios.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSavedScenarios } from './useSavedScenarios'
import { defaultParams } from '@/lib/schema/calculator'

beforeEach(() => localStorage.clear())

describe('useSavedScenarios', () => {
  it('starts with an empty list', () => {
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.scenarios).toEqual([])
  })

  it('save adds a scenario with the correct shape', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    await act(async () => {
      result.current.save('My Plan', defaultParams)
    })
    const s = result.current.scenarios[0]
    expect(s.name).toBe('My Plan')
    expect(s.route).toBe('/compound-interest-calculator')
    expect(s.params).toEqual(defaultParams)
    expect(typeof s.id).toBe('string')
    expect(typeof s.createdAt).toBe('number')
  })

  it('remove deletes the scenario by id', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    await act(async () => {
      result.current.save('Plan A', defaultParams)
    })
    const id = result.current.scenarios[0].id
    await act(async () => {
      result.current.remove(id)
    })
    expect(result.current.scenarios).toHaveLength(0)
  })

  it('load returns params for a matching id', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    const custom = { ...defaultParams, p: 99999 }
    await act(async () => {
      result.current.save('Custom', custom)
    })
    const id = result.current.scenarios[0].id
    expect(result.current.load(id)).toEqual(custom)
  })

  it('load returns undefined for an unknown id', () => {
    const { result } = renderHook(() => useSavedScenarios())
    expect(result.current.load('does-not-exist')).toBeUndefined()
  })

  it('multiple saves prepend newest first', async () => {
    const { result } = renderHook(() => useSavedScenarios())
    await act(async () => { result.current.save('First', defaultParams) })
    await act(async () => { result.current.save('Second', defaultParams) })
    expect(result.current.scenarios[0].name).toBe('Second')
    expect(result.current.scenarios[1].name).toBe('First')
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npm test -- lib/hooks/useSavedScenarios.test.ts
```

Expected: FAIL — `Cannot find module './useSavedScenarios'`

- [ ] **Step 3: Create `lib/hooks/useSavedScenarios.ts`**

```typescript
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { CalculatorParams } from '@/lib/schema/calculator'

export interface SavedScenario {
  id: string
  name: string
  createdAt: number
  route: string
  params: CalculatorParams
}

const STORAGE_KEY = 'finsight:scenarios:v1'

export function useSavedScenarios() {
  const [scenarios, setScenarios] = useLocalStorage<SavedScenario[]>(STORAGE_KEY, [])

  const save = useCallback(
    (name: string, params: CalculatorParams): void => {
      const scenario: SavedScenario = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Untitled',
        createdAt: Date.now(),
        route: '/compound-interest-calculator',
        params,
      }
      setScenarios(prev => [scenario, ...prev])
    },
    [setScenarios],
  )

  const load = useCallback(
    (id: string): CalculatorParams | undefined =>
      scenarios.find(s => s.id === id)?.params,
    [scenarios],
  )

  const remove = useCallback(
    (id: string): void => setScenarios(prev => prev.filter(s => s.id !== id)),
    [setScenarios],
  )

  return { scenarios, save, load, remove }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- lib/hooks/useSavedScenarios.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Run all tests to confirm nothing regressed**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useSavedScenarios.ts lib/hooks/useSavedScenarios.test.ts
git commit -m "feat: add useSavedScenarios hook backed by versioned localStorage"
```

---

## Task 6: useCalculatorState hook

**Files:**
- Create: `lib/hooks/useCalculatorState.ts`

> No unit test file for this hook — it is an integration of already-tested pieces. Math correctness is covered by `compound.test.ts`; URL and storage are covered in their own tests. An integration test here would duplicate those tests without adding confidence.

- [ ] **Step 1: Create `lib/hooks/useCalculatorState.ts`**

```typescript
'use client'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  calculatorSchema,
  defaultParams,
  type CalculatorParams,
} from '@/lib/schema/calculator'
import { useUrlState } from './useUrlState'
import { useSavedScenarios } from './useSavedScenarios'
import {
  calcFV,
  calcRealValue,
  buildYearlyBreakdown,
  type CompoundFreq,
  type ContributionTiming,
} from '@/lib/calc/compound'

export function useCalculatorState() {
  const [initialParams, syncToUrl] = useUrlState(calculatorSchema, defaultParams)

  const form = useForm<CalculatorParams>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: defaultParams,
  })

  // One-time hydration: reset form after URL params are parsed on the client.
  // initialParams starts as defaultParams and updates once after mount.
  useEffect(() => {
    form.reset(initialParams)
  }, [initialParams, form])

  // Keep URL in sync whenever form values change (debounced inside useUrlState)
  useEffect(() => {
    const sub = form.watch(data => {
      const result = calculatorSchema.safeParse(data)
      if (result.success) syncToUrl(result.data)
    })
    return () => sub.unsubscribe()
  }, [form, syncToUrl])

  const params = form.watch()

  const results = useMemo(() => {
    const annualRate = params.r / 100
    const inflationRate = params.infl / 100
    const freq = params.freq as CompoundFreq
    const timing = params.timing as ContributionTiming

    const finalBalance = calcFV(params.p, params.pmt, annualRate, params.t, freq, timing)
    const totalContributed = params.p + params.pmt * params.t * 12
    const interestEarned = finalBalance - totalContributed
    const realBalance = params.inflOn
      ? calcRealValue(finalBalance, inflationRate, params.t)
      : finalBalance
    const yearlyRows = buildYearlyBreakdown(
      params.p, params.pmt, annualRate, params.t, freq, timing,
    )

    return { finalBalance, totalContributed, interestEarned, realBalance, yearlyRows }
  }, [params])

  const savedScenarios = useSavedScenarios()

  return { form, params, results, savedScenarios }
}
```

- [ ] **Step 2: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useCalculatorState.ts
git commit -m "feat: add useCalculatorState orchestration hook"
```

---

## Task 7: CalculatorShell layout component

**Files:**
- Create: `components/calculator/CalculatorShell.tsx`

- [ ] **Step 1: Create `components/calculator/CalculatorShell.tsx`**

```tsx
interface CalculatorShellProps {
  inputPanel: React.ReactNode
  resultPanel: React.ReactNode
  breakdownPanel: React.ReactNode
}

export function CalculatorShell({
  inputPanel,
  resultPanel,
  breakdownPanel,
}: CalculatorShellProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* Left: sticky input panel */}
        <div className="lg:sticky lg:top-20">{inputPanel}</div>
        {/* Right: results + chart */}
        <div className="flex flex-col gap-6">{resultPanel}</div>
      </div>
      {/* Full-width breakdown table */}
      <div className="mt-8">{breakdownPanel}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/calculator/CalculatorShell.tsx
git commit -m "feat: add CalculatorShell two-column layout"
```

---

## Task 8: ResultCard component

**Files:**
- Create: `components/calculator/ResultCard.tsx`

This component renders the three headline stats (Final Balance, Total Contributed, Interest Earned). It receives pre-computed values and formats them using the active currency.

- [ ] **Step 1: Create `components/calculator/ResultCard.tsx`**

```tsx
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
          'font-tabular-nums font-semibold tabular-nums tracking-tight',
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
```

- [ ] **Step 2: Commit**

```bash
git add components/calculator/ResultCard.tsx
git commit -m "feat: add ResultCard with three headline stats"
```

---

## Task 9: BreakdownTable component

**Files:**
- Create: `components/calculator/BreakdownTable.tsx`

The table is always visible on desktop. On mobile it is collapsed behind a disclosure toggle.

- [ ] **Step 1: Check which Collapsible exports the shadcn CLI added**

```bash
head -20 components/ui/collapsible.tsx
```

Note the export names (e.g., `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`) — use them exactly in the next step.

- [ ] **Step 2: Create `components/calculator/BreakdownTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatCurrency } from '@/lib/format/currency'
import type { YearlyRow } from '@/lib/calc/compound'

interface BreakdownTableProps {
  rows: YearlyRow[]
  currency: string
  locale: string
}

export function BreakdownTable({ rows, currency, locale }: BreakdownTableProps) {
  const [open, setOpen] = useState(false)
  const fmt = (v: number) => formatCurrency(v, currency, locale)

  const table = (
    <div className="overflow-x-auto rounded-xl border ring-1 ring-foreground/10">
      <table className="w-full text-sm tabular-nums">
        <thead className="border-b bg-muted/50">
          <tr>
            {['Year', 'Balance', 'Contributed', 'Interest'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => (
            <tr key={row.year} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2.5 font-medium">{row.year}</td>
              <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
                {fmt(row.balance)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{fmt(row.totalContributed)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{fmt(row.interestEarned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Year-by-Year Breakdown</h2>

      {/* Desktop: always visible */}
      <div className="hidden lg:block">{table}</div>

      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium ring-1 ring-foreground/10">
            {open ? 'Hide breakdown' : 'Show year-by-year breakdown'}
            {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">{table}</CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/calculator/BreakdownTable.tsx
git commit -m "feat: add BreakdownTable with collapsible mobile view"
```

---

## Task 10: GrowthChart component

**Files:**
- Create: `components/calculator/GrowthChart.tsx`

Recharts is imported directly inside this component. The component itself is a regular client component; the dynamic import (no SSR) is done in `CompoundCalculator` to avoid hydration mismatches.

- [ ] **Step 1: Create `components/calculator/GrowthChart.tsx`**

```tsx
'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { YearlyRow } from '@/lib/calc/compound'
import { calcRealValue } from '@/lib/calc/compound'

interface GrowthChartProps {
  yearlyRows: YearlyRow[]
  p: number
  inflationOn: boolean
  inflationRate: number
  years: number
  currency: string
}

function compactValue(value: number, symbol: string): string {
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K`
  return `${symbol}${Math.round(value)}`
}

function currencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
        .formatToParts(0)
        .find(p => p.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

export function GrowthChart({
  yearlyRows,
  p,
  inflationOn,
  inflationRate,
  years,
  currency,
}: GrowthChartProps) {
  const symbol = currencySymbol(currency)

  const data = yearlyRows.map(row => ({
    year: row.year,
    principal: p,
    contributions: Math.max(0, row.totalContributed - p),
    interest: Math.max(0, row.interestEarned),
    ...(inflationOn && {
      real: calcRealValue(row.balance, inflationRate, row.year),
    }),
  }))

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Growth Over Time
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#71717a" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#71717a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gContributions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={v => compactValue(v, symbol)}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              compactValue(value, symbol),
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
            labelFormatter={label => `Year ${label}`}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="principal"
            stackId="1"
            stroke="#71717a"
            fill="url(#gPrincipal)"
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="contributions"
            stackId="1"
            stroke="#059669"
            fill="url(#gContributions)"
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="interest"
            stackId="1"
            stroke="#059669"
            fill="url(#gInterest)"
            isAnimationActive={!prefersReducedMotion}
          />
          {inflationOn && (
            <Area
              type="monotone"
              dataKey="real"
              stroke="#f59e0b"
              fill="none"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={!prefersReducedMotion}
            />
          )}
          <Legend
            iconType="square"
            iconSize={10}
            formatter={value => (
              <span style={{ fontSize: '11px', opacity: 0.7 }}>
                {value === 'real'
                  ? 'Real (inflation-adj.)'
                  : value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/calculator/GrowthChart.tsx
git commit -m "feat: add GrowthChart stacked area chart with inflation reference line"
```

---

## Task 11: ShareButton and Disclaimer

**Files:**
- Create: `components/calculator/ShareButton.tsx`
- Create: `components/shared/Disclaimer.tsx`

- [ ] **Step 1: Check which toast function the sonner shadcn component exports**

```bash
head -30 components/ui/sonner.tsx
```

Note the import path for `toast` — it comes from the `sonner` package directly (`import { toast } from 'sonner'`), not from the UI component file.

- [ ] **Step 2: Create `components/calculator/ShareButton.tsx`**

```tsx
'use client'
import { Link2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ShareButton() {
  function handleShare() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success('Link copied!'))
      .catch(() => toast.error('Could not copy link'))
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Link2Icon className="mr-1.5 size-3.5" />
      Share
    </Button>
  )
}
```

- [ ] **Step 3: Create `components/shared/Disclaimer.tsx`**

```tsx
export function Disclaimer() {
  return (
    <p className="mt-12 border-t pt-6 text-xs text-muted-foreground">
      FinSight is an educational tool, not financial advice. Results are
      illustrative and based on the assumptions you enter. Past performance does
      not predict future results. Consult a qualified financial advisor before
      making investment decisions.
    </p>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/calculator/ShareButton.tsx components/shared/Disclaimer.tsx
git commit -m "feat: add ShareButton and Disclaimer components"
```

---

## Task 12: SavedScenariosPanel component

**Files:**
- Create: `components/calculator/SavedScenariosPanel.tsx`

This is a Sheet (side drawer) that lists saved scenarios. On smaller screens it uses the Sheet's default slide-in from the right.

- [ ] **Step 1: Check which Sheet exports the shadcn CLI added**

```bash
head -30 components/ui/sheet.tsx
```

Note the export names (e.g., `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`).

- [ ] **Step 2: Create `components/calculator/SavedScenariosPanel.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add components/calculator/SavedScenariosPanel.tsx
git commit -m "feat: add SavedScenariosPanel sheet with save/load/delete"
```

---

## Task 13: InputPanel component

**Files:**
- Create: `components/calculator/InputPanel.tsx`

This is the most complex component. It uses React Hook Form via a `form` prop passed from `useCalculatorState`, so it does not own its own form — it only renders fields and calls `form.setValue` or uses `register`/`Controller`.

- [ ] **Step 1: Check which Switch, Separator, and Collapsible exports are available**

```bash
head -10 components/ui/switch.tsx
head -10 components/ui/separator.tsx
```

Note export names. Use them exactly in the next step.

- [ ] **Step 2: Create `components/calculator/InputPanel.tsx`**

```tsx
'use client'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { BookmarkIcon, ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CalculatorParams } from '@/lib/schema/calculator'

interface InputPanelProps {
  form: UseFormReturn<CalculatorParams>
  onOpenSaved: () => void
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

const FREQ_OPTIONS = [
  { value: '12', label: 'Monthly' },
  { value: '4', label: 'Quarterly' },
  { value: '1', label: 'Annually' },
  { value: '365', label: 'Daily' },
]

export function InputPanel({ form, onOpenSaved }: InputPanelProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form

  const inflationOn = watch('inflOn')
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

      <Separator />

      <Field
        label="Initial Investment"
        id="p"
        error={errors.p?.message}
      >
        <NumberInput id="p" min={0} step={100} {...register('p', { valueAsNumber: true })} />
      </Field>

      <Field
        label="Monthly Contribution"
        id="pmt"
        error={errors.pmt?.message}
      >
        <NumberInput id="pmt" min={0} step={50} {...register('pmt', { valueAsNumber: true })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Annual Return (%)"
          id="r"
          hint="Negative values allowed"
          error={errors.r?.message}
        >
          <NumberInput id="r" step={0.1} {...register('r', { valueAsNumber: true })} />
        </Field>

        <Field
          label="Time Period (years)"
          id="t"
          error={errors.t?.message}
        >
          <NumberInput id="t" min={1} max={100} step={1} {...register('t', { valueAsNumber: true })} />
        </Field>
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
              onCheckedChange={field.onChange}
              aria-label="Toggle inflation adjustment"
            />
          )}
        />
      </div>

      {inflationOn && (
        <Field
          label="Annual Inflation Rate (%)"
          id="infl"
          error={errors.infl?.message}
        >
          <NumberInput id="infl" min={0} step={0.1} {...register('infl', { valueAsNumber: true })} />
        </Field>
      )}

      {/* Advanced options */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
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
                  onCheckedChange={checked => field.onChange(checked ? 'start' : 'end')}
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
```

- [ ] **Step 3: Run all tests (no regressions expected)**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/calculator/InputPanel.tsx
git commit -m "feat: add InputPanel with React Hook Form, selects, and switches"
```

---

## Task 14: CompoundCalculator and page wire-up

**Files:**
- Create: `app/(tools)/compound-interest-calculator/CompoundCalculator.tsx`
- Modify: `app/(tools)/compound-interest-calculator/page.tsx`

- [ ] **Step 1: Create the Sonner Toaster in the root layout**

Read `app/layout.tsx` to see what providers exist, then add the `<Toaster />`:

```tsx
// In app/layout.tsx, import and add inside <body>:
import { Toaster } from '@/components/ui/sonner'

// Inside <body> (after existing children):
<Toaster richColors position="bottom-right" />
```

Open `app/layout.tsx`, add the import and the `<Toaster />` element just before the closing `</body>` tag.

- [ ] **Step 2: Create `app/(tools)/compound-interest-calculator/CompoundCalculator.tsx`**

```tsx
'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useCalculatorState } from '@/lib/hooks/useCalculatorState'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { CURRENCY_LOCALES } from '@/types'
import { CalculatorShell } from '@/components/calculator/CalculatorShell'
import { InputPanel } from '@/components/calculator/InputPanel'
import { ResultCard } from '@/components/calculator/ResultCard'
import { BreakdownTable } from '@/components/calculator/BreakdownTable'
import { ShareButton } from '@/components/calculator/ShareButton'
import { SavedScenariosPanel } from '@/components/calculator/SavedScenariosPanel'
import { Disclaimer } from '@/components/shared/Disclaimer'

const GrowthChart = dynamic(
  () => import('@/components/calculator/GrowthChart').then(m => ({ default: m.GrowthChart })),
  { ssr: false },
)

export function CompoundCalculator() {
  const { form, params, results, savedScenarios } = useCalculatorState()
  const { currency } = useCurrency()
  const locale = CURRENCY_LOCALES[currency]
  const [savedOpen, setSavedOpen] = useState(false)

  return (
    <>
      <CalculatorShell
        inputPanel={
          <InputPanel form={form} onOpenSaved={() => setSavedOpen(true)} />
        }
        resultPanel={
          <>
            <div className="flex justify-end">
              <ShareButton />
            </div>
            <ResultCard
              finalBalance={results.finalBalance}
              totalContributed={results.totalContributed}
              interestEarned={results.interestEarned}
              realBalance={results.realBalance}
              inflationOn={params.inflOn}
              currency={currency}
              locale={locale}
            />
            <GrowthChart
              yearlyRows={results.yearlyRows}
              p={params.p}
              inflationOn={params.inflOn}
              inflationRate={params.infl / 100}
              years={params.t}
              currency={currency}
            />
          </>
        }
        breakdownPanel={
          <BreakdownTable
            rows={results.yearlyRows}
            currency={currency}
            locale={locale}
          />
        }
      />
      <div className="mx-auto max-w-6xl px-4">
        <Disclaimer />
      </div>

      <SavedScenariosPanel
        open={savedOpen}
        onOpenChange={setSavedOpen}
        scenarios={savedScenarios.scenarios}
        onSave={name => savedScenarios.save(name, params)}
        onLoad={id => {
          const loaded = savedScenarios.load(id)
          if (loaded) form.reset(loaded)
          setSavedOpen(false)
        }}
        onRemove={savedScenarios.remove}
      />
    </>
  )
}
```

- [ ] **Step 3: Replace `app/(tools)/compound-interest-calculator/page.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the dev server and verify the page loads**

```bash
npm run dev
```

Open `http://localhost:3000/compound-interest-calculator` in a browser. Confirm:
- Default values populate (10000, 500, 7%, 30y)
- Result card shows correct final balance (~$76,122 for defaults at 7% over 30y)
- Chart renders
- Changing any input updates results instantly
- URL updates in the address bar after ~300ms
- Inflation toggle shows/hides the rate input
- Share button shows a toast

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx \
  app/(tools)/compound-interest-calculator/CompoundCalculator.tsx \
  app/(tools)/compound-interest-calculator/page.tsx
git commit -m "feat: wire CompoundCalculator page with all components"
```

---

## Task 15: savings-goal-calculator redirect page

**Files:**
- Modify: `app/(tools)/savings-goal-calculator/page.tsx`

This route is an alternate SEO entry for the same calculator. In Phase 2 it simply redirects to `/compound-interest-calculator`.

- [ ] **Step 1: Replace `app/(tools)/savings-goal-calculator/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Savings Goal Calculator — FinSight',
  description:
    'Work backwards from your savings goal. Find out how much you need to invest each month to reach your target.',
}

export default function SavingsGoalPage() {
  redirect('/compound-interest-calculator')
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tools)/savings-goal-calculator/page.tsx
git commit -m "feat: redirect savings-goal-calculator to compound-interest-calculator"
```

---

## Task 16: Final smoke test and phase commit

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS. Note the count.

- [ ] **Step 2: Build for production to catch any type errors**

```bash
npm run build
```

Expected: build succeeds with no errors. Fix any TypeScript errors before proceeding.

- [ ] **Step 3: Manual smoke test checklist**

Start the dev server (`npm run dev`) and verify each of these in the browser:

- [ ] Default values render correct final balance (~$76,122)
- [ ] Changing principal live-updates the result card and chart
- [ ] Inflation toggle: turning on shows "Nominal" sub-value and real balance as headline
- [ ] Inflation toggle: dashed reference line appears on chart
- [ ] Compounding frequency dropdown changes the result
- [ ] Advanced section: contribution timing switch changes the result
- [ ] URL updates after typing (check the address bar after a brief pause)
- [ ] Reload page with URL params — form repopulates with those values
- [ ] Share button: shows "Link copied!" toast
- [ ] Saved panel: save a scenario, close panel, reopen — scenario appears
- [ ] Saved panel: load a scenario — form resets to saved values
- [ ] Saved panel: delete a scenario — it disappears
- [ ] Year-by-year table: correct on desktop (always visible), collapsible on mobile
- [ ] `/savings-goal-calculator` redirects to `/compound-interest-calculator`
- [ ] Dark mode toggle: calculator looks correct in dark mode

- [ ] **Step 4: Final commit if anything was fixed in smoke test**

```bash
git add -A
git commit -m "fix: smoke test corrections for phase 2"
```

(Skip this step if no changes were needed.)

---

## Spec Coverage Check

| Spec requirement | Covered by task |
|---|---|
| Calculator inputs (principal, pmt, rate, years, freq, timing) | Task 13 (InputPanel) |
| Result card (final balance, contributed, interest) | Task 8 |
| Inflation toggle + rate input | Task 13 + Task 8 + Task 10 |
| Interactive stacked area chart | Task 10 |
| Year-by-year breakdown table | Task 9 |
| URL state sync (read on mount, write on change, debounced 300ms) | Task 4 + Task 6 |
| Share button (copy URL, toast) | Task 11 |
| Saved scenarios (save/load/delete, localStorage) | Task 5 + Task 12 |
| Two-column desktop layout, stacked mobile | Task 7 |
| Disclaimer footer text | Task 11 |
| Recharts dynamically imported | Task 14 |
| prefers-reduced-motion respected | Task 10 |
| `/savings-goal-calculator` alternate route | Task 15 |
| Sonner toasts wired into root layout | Task 14 |
