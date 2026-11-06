# Oasis Itaipu: Food Truck System

A web system for **Oasis Itaipu**, a food truck in Parque Tacurú Pucú (Itaipú dam complex, Hernandarias, Paraguay). The truck sells empanadas, coxinhas, sandwiches and drinks, including alcohol.

One Next.js app serves three audiences from the same products, prices and stock:

| Section | Route | Audience | Purpose |
|---|---|---|---|
| Public menu | `/` | Customers (QR code on the truck) | Photos, prices in ₲, "sold out" labels, opening hours |
| POS | `/pos` | The employee on shift | Register sales, take payment, track cash, close the shift |
| Owner panel | `/admin` | The owners | Products, prices, stock, cash control, reports, settings |

## Status

| Plan | Scope | State |
|---|---|---|
| 1. Foundation | Database, row-level security, business functions, login and route guards | **Done** |
| Visual design | Identity, menu / POS / admin mockups | Next |
| 2. POS UI | Sales screen, payment, shifts, cash movements | Planned |
| 3. Owner panel | Products, stock, reports, users, exchange rate, cron | Planned |
| 4. Public menu | Customer-facing menu, caching | Planned |

The `/pos` and `/admin` pages are placeholders for now. Plan 1 delivered the data layer and authentication.

## Key design decisions

- **Two currencies.** Prices are stored in guaraníes (₲, integers). Cash can be paid in reales (R$). Each payment stores the amount received, the exchange rate used and the ₲ equivalent, so old reports never change when the rate does. Change is always given in ₲.
- **Blind cash count.** The POS never shows the employee the expected cash. They count and confirm first, and only then see the expected amount and the difference. Only an owner can correct a count, and every correction is logged.
- **Everything is a movement.** Stock is never overwritten. Sales, voids, restocks and adjustments are all stock movements. Money that leaves or enters the till outside a sale is a cash movement with a mandatory reason.
- **Atomic, idempotent sales.** A sale, its items, its payment and the stock deduction happen in one transaction. A double tap on "Confirm" registers one sale.
- **Security at the database.** Every table has row-level security. Employees cannot change prices, products or stock, even by calling the Supabase API directly. Unit cost is visible to owners only.
- **Login protection.** Employees sign in with a username and a 6-digit PIN. The PIN is never the Supabase password: the real password is an HMAC of username and PIN keyed with a server-side secret. Failed attempts are counted per account and per IP in the database, and an attempt is reserved atomically before Supabase is called, so parallel guesses cannot get past the limit.
- **Business timezone.** `America/Asuncion` for days, shifts and reports.

The full design is in [`docs/specs/2026-11-06-food-truck-sistema-design.md`](docs/specs/2026-11-06-food-truck-sistema-design.md) (in Spanish).

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Server Components, Server Actions)
- React 19, Tailwind CSS, shadcn/ui
- Supabase: PostgreSQL, Auth, Row Level Security
- Vitest and React Testing Library
- Deployed on Vercel

## Getting started

### Prerequisites

- Node.js 22 or later
- Docker (for the local Supabase stack)
- The [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Setup

```bash
npm install
npx supabase start          # local Postgres + Auth; applies migrations
cp .env.example .env.local  # then fill in the values
npm run dev
```

Fill `.env.local` from the output of `npx supabase status`:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never prefix with `NEXT_PUBLIC_` |
| `EMPLEADO_PIN_PEPPER` | Server only. Generate with `openssl rand -base64 48`. Rotating it invalidates every employee PIN |

Create the first owner:

```bash
npx tsx --env-file=.env.local scripts/crear-dueno.ts <email> <password-min-12-chars> <name>
```

Then open `http://localhost:3000/admin/login`. Owners can also use `/pos`.

## Datos de ejemplo

Con `.env.local` configurado como se indica arriba, cargá una base de ejemplo local:

```bash
npx supabase start
npx supabase db reset
npm run db:demo
```

`db reset` borra todos los datos de la base **local** únicamente. El script se niega a cargar datos si ya existen categorías o perfiles.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (Vitest, jsdom) |
| `npm run test:db` | Database tests against local Supabase. Resets the local database first |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:types` | Regenerate `types/supabase.ts` after any schema change |

## Project layout

```
app/                    Routes: /, /pos, /admin (each with a login page and guarded area)
lib/auth/               Access rules, session, login actions, PIN derivation, attempt limiter
lib/supabase/           Server, browser and service-role clients; session-refresh proxy logic
proxy.ts                Next.js proxy: refreshes the session, redirects unauthenticated users
supabase/migrations/    Schema, RLS, and business functions (sales, shifts, stock, rate, limiter)
scripts/                One-off tools (create an owner)
tests/unit/             Vitest unit tests
tests/db/               Database tests: RLS, money formulas, concurrency
docs/specs/             Design specification
docs/superpowers/plans/ Implementation plans
docs/deploy.md          Production checklist
```

## Development workflow

- **Spec first.** Behavior is defined in `docs/specs/` before code is written.
- **Test first.** Vitest, red then green then refactor.
- **Writes go through the database.** Sales, stock, prices and cash movements change only through `security definer` Postgres functions called from Server Actions. Each function sets `search_path = ''`, uses qualified names and grants execute explicitly.
- **Regenerate types** with `npm run db:types` after every schema change.
- **Use explicit column lists on `productos`.** The `costo_gs` column is hidden from non-owners, so `select *` fails for them.
- **Every protected page and Server Action calls `requerirAcceso`.** A layout guard alone is not enough.

## Deployment

See [`docs/deploy.md`](docs/deploy.md) for the production checklist: environment variables, Supabase dashboard settings (signup off, minimum password length, sign-in rate limit), applying migrations from the CLI, and checking the client IP header after the first deploy.

## Not in v1

Online ordering or payment, invoicing and tax integration, card terminal or bank integration, offline POS, recipe-based stock, split payments, multiple trucks or tills, and a Portuguese menu.
