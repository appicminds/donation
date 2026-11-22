# Comfort Kwaw Memorial Fund

Memorial website for Comfort Kwaw: _Forever Comfort — An Eternal Legacy_.
Product requirements: `Comfort_Kwaw_Memorial_Fund_PRD_v1.docx`. Build plan and milestones: [`PLAN.md`](./PLAN.md).

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Vitest · Playwright + axe.
Planned in later milestones: Payload CMS + PostgreSQL (M2), Stripe (M4).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command                           | What it does                                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                     | Start the dev server                                               |
| `npm run build` / `npm start`     | Production build / serve                                           |
| `npm run lint`                    | ESLint                                                             |
| `npm run typecheck`               | Generate route types and run `tsc`                                 |
| `npm run format` / `format:check` | Prettier                                                           |
| `npm test`                        | Unit tests (Vitest)                                                |
| `npm run test:e2e`                | Playwright smoke + accessibility tests (run `npm run build` first) |

## Project layout

```
src/app/            routes, root layout, 404 and error pages
src/components/ui/  design-system primitives (Button, SectionHeading, GlowPortrait…)
src/components/layout/  header, footer, brand mark
src/components/home/    homepage sections
src/content/        site copy and config (moves to the CMS in M2)
src/lib/            utilities, e.g. money helpers (minor units, no mixed currencies)
e2e/                Playwright tests
```

## Content rules (from the PRD)

- Do not invent biography facts, dates, testimonials, totals or donor counts.
- Publish only a **verified** support email and verified social links. `src/content/site.ts` keeps these `null` until confirmed.
- The hero portrait was supplied by the client and is approved for **test/staging only**. Family sign-off (Gate A) is required before production.
- Payments stay disabled until legal and processor approvals are recorded (Gates B–D).
