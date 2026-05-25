# FinSight Phase 1 — Foundation Design Spec

**Date:** 2026-05-25  
**Branch:** `phase-1-foundation`  
**Primary reference:** `finsight-implementation-plan.md`

---

## Overview

Phase 1 establishes the full project scaffold for FinSight: a frontend-only, statically generated investment calculator built with Next.js 16. By the end of this phase the repo has a working root layout with dark mode and currency support, a fully-tested compound interest math library, and a navigable landing shell that links to all tool routes.

---

## 1. Project Initialization & Config

**Approach:** `create-next-app@latest` (Option A) followed by `npx shadcn@latest init`.

**Versions (pinned to latest stable at time of writing):**

| Package | Version |
|---|---|
| Next.js | 16.2.6 |
| React | 19.2.6 |
| TypeScript | 6.0.3 |
| Tailwind CSS | 4.3.0 |
| shadcn CLI | 4.8.0 |
| Zod | 4.4.3 |
| React Hook Form | 7.76.1 |
| Recharts | 3.8.1 |
| Vitest | 4.1.7 |
| lucide-react | 1.16.0 |
| next-themes | 0.4.6 |

**`create-next-app` flags:** App Router enabled, TypeScript strict mode, Tailwind CSS, ESLint, no `src/` directory.

**Tailwind v4:** Configuration lives entirely in `globals.css` via `@import "tailwindcss"` and CSS custom properties — no `tailwind.config.js`. Dark mode uses the `class` strategy (toggling `dark` on `<html>`). shadcn v4 is built around this model and is fully compatible.

**TypeScript 6:** `"strict": true` in `tsconfig.json` is sufficient — no additional flags required.

---

## 2. File Structure

```
/app
  /(marketing)
    page.tsx                              # Landing shell
    about/page.tsx                        # Stub (Phase 5)
  /(tools)
    compound-interest-calculator/page.tsx # Stub
    savings-goal-calculator/page.tsx      # Stub
    historical-simulator/page.tsx         # Stub
    dca-vs-lump-sum/page.tsx              # Stub
  layout.tsx                              # Root layout: ThemeProvider → CurrencyProvider → children
  globals.css                             # Tailwind v4 config + CSS custom properties
  sitemap.ts                              # Stub (Phase 5)
  robots.ts                               # Stub (Phase 5)
/components
  /ui/                                    # shadcn primitives (auto-generated via CLI)
  /shared/
    ThemeToggle.tsx
    CurrencySelector.tsx
    Disclaimer.tsx                        # Stub (Phase 2)
/lib
  /calc/
    compound.ts                           # Full implementation
    compound.test.ts                      # Vitest unit tests
  /hooks/
    useCurrency.ts
  /format/
    currency.ts
    number.ts
/types
  index.ts
/public
  /data/                                  # Empty, ready for Phase 4 JSON files
/docs
  /superpowers/specs/                     # Design specs
```

Tool stub pages contain only an `<h1>` and "Coming soon" text — enough to confirm routing works end-to-end.

---

## 3. Root Layout, Theme Provider & Dark Mode

**Provider order in `app/layout.tsx`:**
```
ThemeProvider (next-themes, attribute="class", defaultTheme="system")
  └── CurrencyProvider
        └── {children}
```

**Header** (sticky, present on every page via root layout):
- FinSight wordmark linking to `/`
- `CurrencySelector` dropdown (right side)
- `ThemeToggle` button (right side, cycles light / dark / system)

**Footer** (every page via root layout):
- Single-line disclaimer as specified in the plan

**Fonts:** Geist Sans + Geist Mono via `next/font`. `font-variant-numeric: tabular-nums` applied globally in `globals.css` to prevent layout shift on numeric updates.

**Dark mode:** `next-themes` writes `class="dark"` to `<html>`. Tailwind v4's `dark:` utilities respond automatically.

---

## 4. Currency Context & Number Formatting

### CurrencyProvider (`/lib/hooks/useCurrency.ts`)

- Detects default currency from `navigator.language` via `Intl` on first mount, mapped to one of the 8 supported codes; falls back to `"USD"`
- Persists selection to localStorage under key `finsight:currency:v1`
- Hydrates from localStorage on subsequent visits
- Exposes `{ currency, setCurrency }` via `useCurrency()` hook

**Supported currencies (launch set):** USD, EUR, GBP, INR, PKR, JPY, CAD, AUD

### `/lib/format/currency.ts`

```ts
formatCurrency(value: number, currency: string, locale?: string): string
```

Uses `Intl.NumberFormat` with `{ style: "currency", currency, maximumFractionDigits: 0 }` for headline figures. No FX conversion — the symbol is cosmetic only. This is documented in `/about` (Phase 5).

### `/lib/format/number.ts`

- `formatCompact(value: number): string` — compact notation (`$1.2M`, `$450K`)
- `formatNumber(value: number, decimals?: number): string` — plain number for tables/charts

### `/types/index.ts`

- `Currency` — union type of the 8 supported currency codes
- `SupportedLocale` — mapped locale per currency, used for `Intl` formatting

---

## 5. Compound Calculator Library & Tests

### `/lib/calc/compound.ts`

All functions are pure, have zero runtime dependencies, and are fully typed.

| Function | Purpose |
|---|---|
| `calcFV(p, pmt, rate, years, freq, timing)` | Final value — standard compound interest formula |
| `calcPMT(fv, p, rate, years, freq)` | Solve for required monthly contribution |
| `calcTime(fv, p, pmt, rate, freq)` | Solve for time to reach target |
| `calcRealValue(nominalFV, inflation, years)` | Inflation-adjusted balance |
| `buildYearlyBreakdown(p, pmt, rate, years, freq, timing)` | Year-by-year `{ year, balance, totalContributed, interestEarned }[]` |

**Formulas (from the plan):**

- FV (monthly compounding, end-of-period):
  `FV = P × (1+i)^N + PMT × ((1+i)^N - 1) / i`  
  where `i = annualRate / 12`, `N = years × 12`
- Start-of-period: multiply PMT term by `(1 + i)`
- PMT solve: `PMT = (FV - P × (1+i)^N) × i / ((1+i)^N - 1)`
- Time solve (P = 0): `N = log(FV × i / PMT + 1) / log(1 + i)`
- Time solve (P > 0): binary search over `[1, 1200]` months, tolerance `0.01`
- Real value: `realFV = nominalFV / (1 + inflation)^years`

**Parameters:**
- `freq`: compounding frequency — `12` (monthly), `365` (daily), `4` (quarterly), `1` (annually)
- `timing`: `"end"` | `"start"` — contribution timing
- All rates passed as decimals (e.g. `0.07` for 7%)

### `/lib/calc/compound.test.ts` (Vitest)

Test coverage:

1. **Correctness** — known values cross-checked against spreadsheet formula
2. **Inverse relationships** — solve PMT → plug back → FV matches; solve time → plug back → FV matches
3. **Edge cases:**
   - Zero principal (`p = 0`)
   - Zero contributions (`pmt = 0`)
   - Negative rate (stress test)
   - Very long horizon (100 years)
   - Monthly contributions with annual compounding (`freq = 1`)
   - Start-of-period vs end-of-period produces correct difference

---

## 6. Landing Page Shell

### Route: `/` (`app/(marketing)/page.tsx`)

**Sections:**

1. **Hero**
   - Large headline: *"Understand your money. Plan your future."*
   - Subtext: one-line value proposition
   - Two CTA buttons: "Try the Calculator" → `/compound-interest-calculator`, "Explore Historical Data" → `/historical-simulator`

2. **Tools grid**
   - 4 cards (one per tool), each with: lucide icon, tool name, one-sentence description, link
   - Tools: Compound Interest Calculator, Historical Simulator, DCA vs Lump Sum, Savings Goal Calculator

**Design:** Neutral zinc base, deep green accent color, full dark mode support. Modern card-based layout (Stripe / Linear / Vercel aesthetic per the plan). The `frontend-design` skill guides component markup during implementation.

**SEO:** `generateMetadata` exports unique `<title>` and `description`. JSON-LD and OG images deferred to Phase 5.

### Tool stub pages

Each of the 4 tool routes renders a single `<h1>` (tool name) + "Coming soon" paragraph. Purpose: confirm App Router route groups resolve correctly and the header/footer render on every page.

---

## Out of Scope for Phase 1

- Playwright E2E setup (Phase 5)
- `About` page content (Phase 5)
- SEO: JSON-LD, OG images, sitemap (Phase 5)
- Calculator UI (Phase 2)
- Goal mode, scenario comparison (Phase 3)
- Historical data files (Phase 4)

---

## Success Criteria

- `npm run build` passes with zero errors
- `npm run test` passes all Vitest tests for `compound.ts`
- All 6 routes resolve in the browser (`/`, `/compound-interest-calculator`, `/savings-goal-calculator`, `/historical-simulator`, `/dca-vs-lump-sum`, `/about`)
- Dark mode toggle works; preference persists on refresh
- Currency selector updates the displayed symbol; preference persists on refresh
- Lighthouse Performance ≥ 90 on the landing page (full ≥ 95 target is Phase 5)
