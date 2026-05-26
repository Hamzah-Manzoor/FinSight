# Phase 5 — Launch Prep: Design Spec

**Date:** 2026-05-26
**Branch:** phase-5-launch-prep (off main)
**Sequence:** Option A — Content → SEO → Deploy → Audit

---

## Overview

Phase 5 completes FinSight for public launch. All four tools are built and working on `main`. This phase adds the About page, full SEO instrumentation, Vercel deployment, and a Lighthouse/accessibility audit pass.

---

## 1. About Page

**Route:** `/about`
**Rendering:** Next.js Server Component — reads `*.meta.json` files from `/public/data/` at build time via `fs`.

### Sections (top to bottom)

| Section | Content |
|---|---|
| Header | `<h1>About FinSight</h1>` + one-sentence mission |
| Compound Interest | FV formula, PMT-solve formula, time-solve (binary search note for P>0), annuity-due variant — each in a styled `<pre>` block |
| Inflation Adjustment | One paragraph: `realFV = nominalFV / (1 + r)^n` |
| Historical Data Sources | Table: asset name, source name, date range, "Data updated: YYYY-MM-DD" — dates read from `*.meta.json` at build time |
| Currency Note | Explains cosmetic-symbol-only approach; no FX conversion; links to currency selector in header |
| Disclaimer | Full disclaimer from spec: "FinSight is an educational tool…" |

### Metadata
```ts
title: 'About'   // renders as "About | FinSight" via layout template
description: 'How FinSight works: compound interest formulas, historical data sources, methodology, and disclaimers.'
```

---

## 2. SEO Layer

### 2.1 JSON-LD Structured Data

A shared `JsonLd` component renders a `<script type="application/ld+json">` tag. Placed inside each page's `<main>`.

Schema: `WebApplication`
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "<page title>",
  "description": "<page description>",
  "url": "https://<domain>/<route>",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

Applied to all 5 tool/marketing pages (landing, compound calculator, savings goal, historical simulator, dca-vs-lump-sum, about).

### 2.2 Open Graph & Twitter Cards

Each page's `metadata` export extended with:
```ts
openGraph: {
  title: '<page title>',
  description: '<page description>',
  url: 'https://<domain>/<route>',
  siteName: 'FinSight',
  type: 'website',
  images: [{ url: '/api/og?title=<encoded title>', width: 1200, height: 630 }],
}
twitter: {
  card: 'summary_large_image',
  title: '<page title>',
  description: '<page description>',
  images: ['/api/og?title=<encoded title>'],
}
```

### 2.3 Dynamic OG Images

**Route:** `app/api/og/route.tsx`
**Library:** `next/og` → `ImageResponse` (1200×630)

Template layout:
- Emerald gradient background
- "FinSight" wordmark top-left (bold, white)
- Page title large and centered (white, 60px)
- Tagline below title: "Free investment calculators. No signup, no ads." (zinc-300, 28px)

Accepts `?title=<string>` query param. Defaults to "FinSight — Investment Calculators" if param is missing.

### 2.4 Sitemap

`app/sitemap.ts` returns all 6 routes:

| URL | Priority | changeFrequency |
|---|---|---|
| `/` | 1.0 | monthly |
| `/compound-interest-calculator` | 0.9 | monthly |
| `/savings-goal-calculator` | 0.8 | monthly |
| `/historical-simulator` | 0.8 | monthly |
| `/dca-vs-lump-sum` | 0.8 | monthly |
| `/about` | 0.5 | monthly |

`lastModified: new Date()` on all entries.

### 2.5 Robots

`app/robots.ts` updated to add:
```ts
sitemap: 'https://<domain>/sitemap.xml'
```
Uses a `NEXT_PUBLIC_SITE_URL` environment variable (set in Vercel dashboard) so the domain doesn't need to be hardcoded in source.

---

## 3. Vercel Deployment

One-time setup — no application code changes.

### Steps
1. `npm i -g vercel && vercel login`
2. `vercel` from project root — auto-detects Next.js, creates project, returns preview URL
3. `vercel --prod` — promotes to production
4. No `vercel.json` required (Next.js auto-detection covers everything)

### Custom Domain (registrar-agnostic, whenever domain is purchased)
1. Vercel dashboard → Project → Settings → Domains → Add domain
2. At registrar: `CNAME www → cname.vercel-dns.com`, `A @ → 76.76.19.61`
3. Vercel provisions TLS automatically
4. Set `NEXT_PUBLIC_SITE_URL=https://<domain>` in Vercel environment variables
5. Redeploy so robots.ts picks up the real sitemap URL

### Environment Variables
None required for launch. The app is fully static with no secrets.

---

## 4. Lighthouse & Accessibility Audit

### Proactive A11y Fixes (before deploy)

| Area | Fix |
|---|---|
| Icon-only controls | Add `aria-label` to `ThemeToggle`, `CurrencySelector`, share/save icon buttons |
| Charts | Add `aria-hidden="true"` to Recharts containers; add a visually-hidden label pointing users to the breakdown table |
| Reduced motion | Verify chart animations respect `prefers-reduced-motion` (disable `isAnimationActive` in Recharts when media query matches) |
| Form labels | Confirm every calculator input has an associated `<label>` (not placeholder-only) |

### Post-Deploy Audit
- Run Lighthouse in Chrome DevTools (or `npx lighthouse <url> --view`) on each page after `vercel --prod`
- Targets: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100
- Fix issues iteratively; redeploy until all pages pass
- No CI integration for now — manual audit documented as part of launch checklist

### Tools
- Chrome DevTools Lighthouse tab (built-in, no install)
- Chrome DevTools Accessibility panel (axe-powered, built-in)
- No `@axe-core/react` — avoids bundle weight, removed before ship anyway

---

## Out of Scope for Phase 5

- Monte Carlo simulation, retirement drawdown, multi-goal tracker (deferred in spec)
- Analytics integration (Vercel Analytics can be added post-launch with one line)
- Tax modeling, real-time data, user accounts
