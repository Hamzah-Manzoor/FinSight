# FinSight — Implementation Plan

A production-grade investment calculator and historical market simulator. Frontend-only, built with Next.js. No backend, no database, no user accounts.

---

## 1. Goals & Audience

**Mission**: A beautiful, trustworthy, mobile-first tool that helps people understand compounding, plan savings goals, and explore historical market data — without signups or friction.

**Target users**:
- Curious beginners learning how compounding works
- Planners modeling specific goals (down payment, retirement, FIRE)
- Tinkerers exploring "what if I'd invested in X" scenarios

Global audience with multi-currency support.

**Non-goals**: Account management, portfolio tracking, real-time price feeds, financial guides/articles, financial advice.

---

## 2. Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI primitives**: shadcn/ui (Radix-based, accessible)
- **Charts**: Recharts
- **Forms / validation**: React Hook Form + Zod
- **State**: React state + URL search params + localStorage (no Redux/Zustand)
- **Icons**: lucide-react
- **Fonts**: Geist or Inter, with `font-variant-numeric: tabular-nums` for figures
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics or Plausible (privacy-friendly)

### Rendering strategy

- All pages **statically generated** (SSG) for SEO and speed.
- Calculations run **client-side** for instant feedback.
- Historical data shipped as static JSON in `/public/data/`.

---

## 3. Routes / Information Architecture

| Route | Purpose |
|---|---|
| `/` | Landing page with feature highlights and links to each tool |
| `/compound-interest-calculator` | Core calculator with goal mode |
| `/savings-goal-calculator` | Same tool, goal mode default (alternate SEO entry) |
| `/historical-simulator` | "If you invested $X on [date]" using S&P 500, BTC, gold, treasuries |
| `/dca-vs-lump-sum` | DCA vs lump sum on historical data |
| `/about` | Methodology, formulas, data sources, disclaimers |

Each page must have unique meta title, description, and JSON-LD structured data.

---

## 4. Currency & Localization

- Supported currencies (launch set): USD, EUR, GBP, INR, PKR, JPY, CAD, AUD
- Auto-detect from `navigator.language` / `Intl` on first visit; user can change via dropdown in header
- Persist selection in localStorage (key: `finsight:currency:v1`)
- Format with `Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })` for headline figures
- All calculations are currency-agnostic; only display formatting changes
- No FX conversion — the symbol is purely cosmetic. Document this clearly in `/about`.

---

## 5. Tier 1 — MVP Features

### 5.1 Compound Interest Calculator

**Inputs**:
- Initial investment (principal): number ≥ 0
- Monthly contribution: number ≥ 0
- Annual return rate (%): number (allow negative for stress testing)
- Time period (years): number > 0, max 100
- Compounding frequency: dropdown — Monthly (default), Daily, Quarterly, Annually
- Contribution timing: toggle — End of period (default) / Start of period — inside "Advanced" disclosure

**Outputs**:
- Final balance (large, prominent)
- Total contributed (principal + sum of contributions)
- Total interest earned
- Real (inflation-adjusted) balance when inflation toggle is on
- Interactive stacked area chart of balance over time (principal vs contributions vs interest)
- Year-by-year breakdown table — collapsible on mobile, full on desktop

**Formula** (monthly compounding, end-of-period contributions):

```
i = annualRate / 12
N = years × 12
FV = P × (1 + i)^N + PMT × ((1 + i)^N - 1) / i
```

- For **start-of-period** (annuity due), multiply the PMT term by `(1 + i)`.
- For other compounding frequencies, adjust `n` and `i`. When compounding frequency differs from contribution frequency (always monthly), document the assumption in `/about` and a tooltip.

**Inflation toggle**:
- Input: expected annual inflation rate (default 2.5%)
- `realFV = nominalFV / (1 + inflation)^years`
- Toggle switches headline number, chart, and breakdown between nominal and real

### 5.2 Goal Mode (same page, mode toggle)

A segmented control at the top of the calculator picks which variable is solved for:

1. **Solve for final value** — default, standard mode
2. **Solve for monthly contribution** — given target, principal, rate, time, find required PMT
3. **Solve for time** — given target, principal, rate, PMT, find years required

**Formulas**:

- **PMT solve**:
  ```
  PMT = (FV - P × (1+i)^N) × i / ((1+i)^N - 1)
  ```

- **Time solve when P = 0**:
  ```
  N = log(FV × i / PMT + 1) / log(1 + i)
  ```

- **Time solve when P > 0**: no closed form (N appears non-isolatable). Use **binary search** on N over `[1, 1200]` months with tolerance 0.01.

UI: when a mode is active, the corresponding input becomes read-only and visually styled as a result, while the previously-output field becomes an input.

### 5.3 Scenario Comparison

- "Add scenario" button creates up to **3** simultaneous scenarios
- Each scenario has its own collapsible, color-coded input panel
- Single chart overlays all scenario growth curves with matching colors
- Summary table compares final balances, total contributed, interest earned, CAGR
- Each scenario is independently named (e.g., "Conservative", "Aggressive")

### 5.4 Shareable URLs

Encode inputs as URL search params:

```
/compound-interest-calculator?p=10000&pmt=500&r=8&t=30&freq=12&infl=2.5&mode=fv&cur=USD
```

- On mount: parse URL params, validate with Zod, hydrate state
- On change: debounced (300ms) `history.replaceState` (no scroll, no remount)
- "Share" button copies current URL to clipboard with toast confirmation
- Scenario comparison URLs use `s1=...&s2=...&s3=...` with each scenario's params URL-encoded

### 5.5 Saved Scenarios (localStorage)

- "Save scenario" button prompts for a name
- Saved scenarios listed in a side panel/drawer
- Each shows name, summary line, "Load" and "Delete" actions
- Storage key: `finsight:scenarios:v1`
- Schema: `{ id: string, name: string, createdAt: number, route: string, params: Record<string, string | number> }`
- Versioned key allows future migrations

### 5.6 Disclaimers

Footer on every calculator page:

> *FinSight is an educational tool, not financial advice. Results are illustrative and based on the assumptions you enter. Past performance does not predict future results. Consult a qualified financial advisor before making investment decisions.*

---

## 6. Tier 2 — Differentiators

### 6.1 Historical Simulator (`/historical-simulator`)

**Inputs**:
- Asset: dropdown — S&P 500 (Total Return), Bitcoin, Gold, US 10Y Treasury
- Initial investment amount
- Start date (month/year picker; bounded by asset's data range)
- End date (defaults to most recent available)
- Optional: monthly contribution

**Outputs**:
- Final value, total return %, CAGR
- Growth chart with **shaded drawdown periods**
- Screenshot-friendly result card: "You would have invested $X and have $Y today"
- Worst drawdown stat: "Largest peak-to-trough: -X% over Y months"
- Year-by-year returns table

**Data files** in `/public/data/`:

- `sp500.json` — monthly total return index from 1928 (source: Shiller / Damodaran)
- `bitcoin.json` — daily prices from 2010-07 (source: CoinGecko historical export)
- `gold.json` — monthly prices from 1968 (source: World Gold Council / LBMA)
- `treasury10y.json` — monthly total return (source: NYU Damodaran datasets)

Format: `[{ "date": "YYYY-MM-DD", "value": number }, ...]`

Each data file should have a sibling `*.meta.json` documenting source URL, license, and last-updated date. Surface "Data updated: <date>" in `/about`.

### 6.2 DCA vs Lump Sum (`/dca-vs-lump-sum`)

- User picks asset, total amount to invest, time period, DCA frequency (weekly/monthly)
- Compute both strategies on chosen historical window
- Chart overlays both growth curves
- Result card: "Lump sum: $X. DCA: $Y. Lump sum wins by Z%." (or DCA wins)
- Optional toggle: "Show all historical start dates" — runs both strategies over every possible start date of the chosen window length and shows what % of the time each strategy won (bar/histogram)

---

## 7. Design System

- **Aesthetic**: clean, modern, confident. Reference points: Stripe, Linear, Vercel.
- **Color**: neutral base (white/zinc) + one accent. Suggest deep green for "growth", but final call during design. Dark mode supported via Tailwind `dark:` and a header toggle.
- **Numbers**: `tabular-nums` everywhere monetary values appear, to prevent layout shift as inputs change
- **Inputs**: min 44px touch targets; labels above (never inside) inputs; helper text below
- **Charts**: responsive; touch-friendly tooltips on mobile; human-readable axis labels ("$1.2M", not "1,200,000"); legend below chart on mobile
- **Empty states**: prefill calculators with sensible defaults (e.g., $10,000 initial, $500/mo, 7%, 30 years) so first-time visitors immediately see a result

Read `/mnt/skills/public/frontend-design/SKILL.md` before implementing UI components.

---

## 8. SEO Requirements

For each page:
- Unique `<title>` matching high-intent search query
- Meta description ~155 chars
- Open Graph and Twitter card images (auto-generated per page via `next/og`, or static)
- JSON-LD `WebApplication` structured data
- Semantic HTML: one `<h1>` per page, proper heading hierarchy
- Internal links between calculator pages (sidebar or footer)
- `sitemap.xml` and `robots.txt` via Next.js conventions (`app/sitemap.ts`, `app/robots.ts`)
- Lighthouse targets: Performance ≥ 95, Accessibility ≥ 95, SEO = 100

---

## 9. Accessibility

- WCAG 2.1 AA
- All inputs labeled; error messages announced via `aria-live="polite"`
- Charts have a text alternative — the breakdown table is always reachable
- Full keyboard navigation; visible focus states on all interactive elements
- Color contrast ≥ 4.5:1 for text
- Respect `prefers-reduced-motion` (no chart animations when set)

---

## 10. Performance

- All pages SSG; no client-side data fetching on initial render
- Historical JSON lazy-loaded only on `/historical-simulator` and `/dca-vs-lump-sum`
- Code-split Recharts via dynamic import
- `next/font` for fonts (no FOUT)
- Target: < 100 KB initial JS per page, < 1.5 s LCP on mobile 3G

---

## 11. State Management

- **Form state**: React Hook Form per calculator
- **Derived calculations**: pure functions in `/lib/calc/`, memoized via `useMemo`
- **URL sync**: custom `useUrlState` hook — serializes state to search params, reads on mount, debounced writes
- **Saved scenarios**: custom `useLocalStorage` hook with versioned key
- **Currency**: React Context (small state, only changes on user action)

---

## 12. File Structure

```
/app
  /(marketing)
    page.tsx                          # Landing
    about/page.tsx
  /(tools)
    compound-interest-calculator/page.tsx
    savings-goal-calculator/page.tsx
    historical-simulator/page.tsx
    dca-vs-lump-sum/page.tsx
  layout.tsx
  sitemap.ts
  robots.ts
/components
  /ui/                                # shadcn primitives
  /calculator/
    CalculatorShell.tsx
    InputPanel.tsx
    ResultCard.tsx
    GrowthChart.tsx
    BreakdownTable.tsx
    ModeToggle.tsx
    ScenarioManager.tsx
  /historical/
    AssetPicker.tsx
    DateRangePicker.tsx
    DrawdownChart.tsx
  /shared/
    CurrencySelector.tsx
    ShareButton.tsx
    Disclaimer.tsx
    ThemeToggle.tsx
/lib
  /calc/
    compound.ts                       # FV, PMT, time-solve
    inflation.ts
    historical.ts                     # returns, drawdowns, CAGR
    dca.ts
  /hooks/
    useUrlState.ts
    useLocalStorage.ts
    useCurrency.ts
  /format/
    currency.ts
    number.ts
    date.ts
  /schema/
    calculator.ts                     # Zod schemas for URL params
/public
  /data/
    sp500.json
    sp500.meta.json
    bitcoin.json
    bitcoin.meta.json
    gold.json
    gold.meta.json
    treasury10y.json
    treasury10y.meta.json
/types
  index.ts
```

---

## 13. Testing

- **Vitest** unit tests for every function in `/lib/calc/`. Math correctness is the most important guarantee in this product.
- **Property-based tests** for inverse relationships: solve for PMT, plug back, FV should match.
- **Edge cases**: zero principal, zero contributions, negative rate, very long horizons (100 years), monthly contribution but annual compounding.
- **Playwright E2E smoke test**: load each calculator, enter values, verify a result renders.

---

## 14. Build Phases

**Phase 1 — Foundation**
1. Initialize Next.js + TypeScript + Tailwind + shadcn/ui
2. Set up file structure, root layout, theme provider, dark mode
3. Currency context + number formatting utilities
4. Implement `/lib/calc/compound.ts` with full test coverage
5. Landing page shell

**Phase 2 — Core calculator**
1. Compound interest calculator UI (inputs, result card, growth chart, breakdown table)
2. Inflation toggle
3. URL state sync (`useUrlState`)
4. Saved scenarios (localStorage)
5. Share button
6. Mobile polish

**Phase 3 — Goal mode + comparison**
1. Mode toggle (FV / PMT / time)
2. Implement solve-for-PMT and solve-for-time (including binary search for the P>0 case)
3. Scenario comparison (up to 3 overlaid)

**Phase 4 — Historical simulator**
1. Source, clean, and ship historical data JSON files + meta files
2. Asset picker, date range picker
3. Historical calculation logic (returns, drawdowns)
4. Result card and drawdown chart
5. DCA vs lump sum page

**Phase 5 — Launch prep**
1. About page (methodology, formulas, data sources)
2. SEO: meta tags, JSON-LD, sitemap, robots, OG images
3. Lighthouse pass on every page (≥95 targets)
4. Accessibility audit (axe + manual keyboard test)
5. Deploy to Vercel, configure custom domain

---

## 15. Open Questions (defer)

- Tooltip with historical-average return rates for the "expected return" field?
- Multi-goal tracker (track several savings goals at once)
- Monte Carlo simulation for return uncertainty
- Retirement drawdown (decumulation) calculator

---

## 16. Explicitly Out of Scope

- User accounts, authentication, server-side persistence
- Real-time market data
- Investment guides / educational articles (use contextual tooltips instead)
- Tax modeling
- Portfolio tracking
- Notifications, email
- FX conversion between currencies
