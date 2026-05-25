# Phase 2 — Core Calculator Design Spec

**Date**: 2026-05-25  
**Phase**: 2 of 5  
**Scope**: Compound interest calculator UI, inflation toggle, URL state sync, saved scenarios, share button, mobile polish.

---

## 1. Goals

Deliver a fully interactive compound interest calculator page at `/compound-interest-calculator`. By the end of this phase, a visitor can:

- Enter principal, monthly contribution, rate, years, compounding frequency, and contribution timing.
- See the final balance, total contributed, and interest earned update instantly.
- Toggle inflation adjustment on/off with a custom rate.
- Read a stacked-area growth chart and a year-by-year breakdown table.
- Copy a shareable URL that encodes all inputs.
- Save, load, and delete named scenarios via localStorage.

This phase does not include goal-mode (solve for PMT/time), scenario comparison, or historical data — those are Phase 3 and 4.

---

## 2. Aesthetic Direction

**Refined minimalism** — Linear/Stripe precision. Clean lines, generous whitespace, confident typography.

- **Color**: Neutral zinc base (white/zinc-950 in dark mode). Deep green accent (`emerald-600` / `#059669`) for growth figures and interactive highlights.
- **Typography**: Geist (already configured). `tabular-nums` on every monetary figure. Large, bold final balance as the page hero.
- **Motion**: Smooth value transitions when inputs change (CSS transitions on result numbers, Recharts animation on chart). `prefers-reduced-motion` respected — transitions disabled.
- **Inputs**: Labels above, min 44px touch targets, helper text below. shadcn/ui primitives throughout.
- **Numbers**: Formatted with the active currency via `useCurrency` context. Compact notation for large values in chart axis labels ("$1.2M").

---

## 3. Page Structure

```
/compound-interest-calculator
├── page.tsx                  ← metadata (SSG), renders <CompoundCalculator />
└── CompoundCalculator.tsx    ← 'use client' root; owns all state via useCalculatorState
```

### Desktop layout (lg+)

```
┌─────────────────────────────────────────────────────┐
│  Header (sticky)                                    │
├──────────────────┬──────────────────────────────────┤
│  InputPanel      │  ResultCard (3 stats)            │
│  (sticky, ~380px)│  GrowthChart                     │
│                  │                                  │
├──────────────────┴──────────────────────────────────┤
│  BreakdownTable (full width, collapsible on mobile) │
└─────────────────────────────────────────────────────┘
```

### Mobile layout

Inputs → ResultCard → GrowthChart → BreakdownTable (stacked, vertically scrollable).

---

## 4. Components

### `CalculatorShell`

Layout wrapper only. Renders a two-column grid on desktop, single column on mobile. No state. Accepts `inputPanel`, `resultPanel`, and `breakdownPanel` slot props.

### `InputPanel`

React Hook Form connected to the Zod `CalculatorParams` schema. Fields:

| Field | Type | Default | Constraint |
|---|---|---|---|
| Principal | number input | 10,000 | ≥ 0 |
| Monthly contribution | number input | 500 | ≥ 0 |
| Annual return rate | number input | 7 | any (negative allowed) |
| Time period (years) | number input | 30 | 1–100 |
| Compounding frequency | select | Monthly (12) | 1/4/12/365 |
| Contribution timing | toggle (Switch) | End of period | start/end — inside Advanced disclosure |
| Inflation toggle | Switch | off | — |
| Inflation rate | number input (conditional) | 2.5 | ≥ 0, shown only when inflation is on |

Form submits on every valid change (watch mode, no submit button). Debounced 300ms write to URL.

### `ResultCard`

Three stat blocks in a row (stacked on mobile):

1. **Final Balance** — largest, green accent, currency-formatted.
2. **Total Contributed** — principal + sum of contributions.
3. **Interest Earned** — final balance minus total contributed.

When inflation is on, each shows nominal and real values. A small badge indicates "Inflation-adjusted" when real mode is active.

### `GrowthChart`

Recharts `AreaChart` with three stacked series:

- **Principal** — `zinc-300`/`zinc-700`
- **Contributions** — `emerald-200`/`emerald-800`
- **Interest** — `emerald-500`/`emerald-400`

Y-axis: compact currency labels ("$1.2M"). X-axis: year numbers. Responsive container, touch-friendly tooltip. Dynamically imported (`next/dynamic`, no SSR) to avoid hydration issues and keep initial bundle small.

When inflation is on, a dashed reference line shows real (inflation-adjusted) total.

Animation disabled when `prefers-reduced-motion` is set.

### `BreakdownTable`

Year-by-year rows: Year | Balance | Total Contributed | Interest Earned | Interest This Year.

- Desktop: full table always visible.
- Mobile: collapsed by default behind a "Show yearly breakdown" toggle.
- Sticky header row.
- Currency-formatted cells with `tabular-nums`.

### `InflationToggle`

A `Switch` that shows/hides the inflation rate input. Lives inside `InputPanel`. Toggling updates the `CalculatorParams` state immediately.

### `ShareButton`

Icon button (link icon). On click: calls `navigator.clipboard.writeText(window.location.href)`, shows a toast "Link copied!". No external service.

### `SavedScenariosPanel`

A `Sheet` (desktop slide-over) / `Drawer` (mobile) triggered by a "Saved" button in the input panel header.

Contents:
- "Save current" input (name) + Save button.
- List of saved scenarios: name, summary line (e.g., "$10k @ 7% for 30y → $76k"), Load button, Delete button.
- Empty state: "No saved scenarios yet."

Storage key: `finsight:scenarios:v1`. Schema per the implementation plan.

### `Disclaimer`

Static footer text on the calculator page (per §5.6 of the implementation plan).

---

## 5. Hooks

### `useUrlState<T>(schema, defaults, debounceMs)`

- On mount: parses `window.location.search` with Zod; falls back to `defaults` on parse error.
- Returns `[state, setState]`.
- On state change: debounced `history.replaceState` — no navigation, no scroll.
- Generic: works with any Zod object schema.

### `useLocalStorage<T>(key, defaultValue)`

- SSR-safe (reads only on client, returns `defaultValue` on server).
- Keeps in-memory value in sync across hook calls via a storage event listener for cross-tab sync.
- Versioned key pattern: callers pass `finsight:scenarios:v1`.

### `useSavedScenarios()`

Built on `useLocalStorage`. Returns:
- `scenarios: SavedScenario[]`
- `save(name: string, params: CalculatorParams): void`
- `load(id: string): CalculatorParams`
- `remove(id: string): void`

### `useCalculatorState()`

The page-level orchestration hook. Composes:

1. `useUrlState(calculatorSchema, defaultParams)` → `params`
2. React Hook Form, initialized from `params`, watches for changes → updates URL state
3. `useMemo` → `results: { finalBalance, totalContributed, interestEarned, realBalance, yearlyRows }`
4. `useSavedScenarios()` → scenario CRUD
5. Inflation on/off state (boolean, part of params)

Returns everything `CompoundCalculator` needs to pass to child components.

---

## 6. Zod Schema (`lib/schema/calculator.ts`)

```typescript
export const calculatorSchema = z.object({
  p:    z.coerce.number().min(0).default(10000),           // principal
  pmt:  z.coerce.number().min(0).default(500),             // monthly contribution
  r:    z.coerce.number().default(7),                      // annual rate %
  t:    z.coerce.number().min(1).max(100).default(30),     // years
  freq: z.coerce.number().pipe(z.union([                   // compounding frequency
          z.literal(1), z.literal(4),
          z.literal(12), z.literal(365)
        ])).default(12),
  timing: z.enum(['start', 'end']).default('end'),
  infl:   z.coerce.number().min(0).default(2.5),           // inflation rate %
  // Boolean URL param encoded as '1'/'0' — z.coerce.boolean() treats "false" as true (truthy string)
  inflOn: z.preprocess(v => v === '1' || v === true, z.boolean()).default(false),
})

export type CalculatorParams = z.infer<typeof calculatorSchema>
```

The URL uses these exact keys (matching the implementation plan).

---

## 7. Saved Scenario Schema

```typescript
interface SavedScenario {
  id: string           // nanoid or crypto.randomUUID()
  name: string
  createdAt: number    // Date.now()
  route: string        // '/compound-interest-calculator'
  params: CalculatorParams
}
```

---

## 8. New shadcn Primitives Required

- `Switch` — for inflation toggle and contribution timing
- `Sheet` — for saved scenarios panel on desktop
- `Drawer` — for saved scenarios panel on mobile (shadcn Drawer uses Vaul)
- `Sonner` (toast) — for "Link copied" and "Scenario saved" feedback
- `Collapsible` — for BreakdownTable mobile expand/collapse and Advanced disclosure
- `Separator` — visual dividers in InputPanel

These should be added with `npx shadcn@latest add <component>` during implementation.

---

## 9. Data Flow

```
URL params (on mount)
       ↓
useCalculatorState
  ├── React Hook Form (validates + watches)
  │     ↓ (on change, debounced)
  │   useUrlState.setState → history.replaceState
  │
  ├── useMemo → calcFV / buildYearlyBreakdown → results
  │
  └── useSavedScenarios → save / load / remove
         ↓
  CompoundCalculator
    ├── InputPanel    ← form, inflation toggle, save button
    ├── ResultCard    ← finalBalance, totalContributed, interestEarned, realBalance
    ├── GrowthChart   ← yearlyRows, inflationOn
    ├── BreakdownTable ← yearlyRows
    └── ShareButton   ← (reads window.location.href directly)
```

---

## 10. Routing & Metadata

`/savings-goal-calculator` is an alternate SEO entry for the same calculator. In Phase 2, it renders a thin wrapper that redirects to (or re-exports) `CompoundCalculator` with the same defaults.

`page.tsx` exports static metadata:
```typescript
export const metadata: Metadata = {
  title: 'Compound Interest Calculator — FinSight',
  description: 'See how your investment grows over time. Adjust principal, contributions, rate, and time to model any scenario.',
}
```

---

## 11. Testing

- Unit tests for `useUrlState` (parse, serialize, debounce behavior) using Vitest + happy-dom.
- Unit tests for `useLocalStorage` and `useSavedScenarios`.
- Existing `compound.ts` tests already cover the math layer — no new calc tests needed in this phase.
- No E2E in this phase (Playwright is Phase 5).

---

## 12. Out of Scope (Phase 2)

- Goal mode (solve for PMT / time) — Phase 3
- Scenario comparison (multiple overlaid scenarios) — Phase 3
- Historical simulator — Phase 4
- DCA vs lump-sum — Phase 4
- About page, SEO audit, OG images — Phase 5
