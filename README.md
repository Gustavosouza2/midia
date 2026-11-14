# Cantina da Mídia

Sales app for the canteen run by the media team at Igreja Casa do Pai. It is an offline-first PWA:
after the first visit it opens and works without internet.

The app's UI is in Portuguese. The code, file names, comments, tests and docs are in English.

> Current state: the Dashboard, Sales, Pending and Menu screens work offline, reading and writing the
> local database. Sync with the server (sending the outbox and pulling changes) does not exist yet:
> for now only the canteen is downloaded from the API.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL
npm run dev                  # http://localhost:3000
```

The service worker is only generated in the production build. To try offline mode in the browser:

```bash
npm run build && npm run start
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Server connection to Supabase's Postgres (transaction-mode pooler, port 6543). |
| `CANTEEN_SLUG` | no | Canteen served by this deploy. Default: `midia`. |

On Vercel, set the same variables under *Settings > Environment Variables*.

## Database (Drizzle + Supabase)

The schema lives in `src/db/schema.ts` and the migrations in `drizzle/`.

```bash
npm run db:generate   # generates a migration from the schema changes
npm run db:migrate    # applies pending migrations to the DATABASE_URL database
npm run db:seed       # creates the "Mídia" canteen with 2 products (safe to run more than once)
npm run db:studio     # opens Drizzle Studio to browse the data
```

The Postgres tables and columns still have Portuguese names (`produtos`, `preco_centavos`, …). The
Drizzle schema maps them to English TypeScript keys (`products`, `priceCents`, …), so the code never
uses the Portuguese names. Renaming them in Postgres needs its own migration.

Triggers, grants and anything else Drizzle does not generate live in custom migrations
(`npx drizzle-kit generate --custom --name=description`).

## Tests

```bash
npm run lint
npm run typecheck
npm test              # Vitest (unit)
npm run test:e2e      # build + Playwright (end to end, offline included)
```

The first time, install the Playwright browser: `npx playwright install chromium`.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, Vitest, build and Playwright on
every push.

## Structure

```
src/
  app/                 pages and routes (App Router)
    (app)/             screens: / (Dashboard), /sales, /pending, /menu
    api/health/        GET /api/health → { ok: true }
    api/canteen/       GET /api/canteen (this deploy's canteen, downloaded by the app)
    api/products/      GET /api/products
    serwist/[path]/    generates the service worker at build time
    sw.ts              service worker code
    manifest.ts        PWA manifest
  components/          React components, one folder per screen
    ui/                shadcn/ui components, adjusted to the design tokens
    day/               day filter (all 4 screens), "Novo dia" and "Remover dia" (Sales and Menu)
  db/                  Drizzle schema and connection (server only)
  lib/                 pure read models for each screen (with tests) and formatting
  local-db/            local IndexedDB database (Dexie), writes (writes.ts) and the outbox queue
  server/              server-only code (configuration)
drizzle/               SQL migrations
scripts/seed.ts        initial seed
e2e/                   Playwright tests
```

## Architecture decisions

- **PWA with Next.js** (App Router) and TypeScript in strict mode.
- **Offline-first.** The UI reads and writes only to IndexedDB (Dexie.js), and an outbox queue will
  sync with the API.
- **Database on Supabase (Postgres), reached only through the Next.js API with Drizzle ORM.** The
  browser never talks to the database directly. Every table has RLS on with no policy, and
  Supabase's public keys (`anon` and `authenticated`) have no grants on them.
- **v1 has no login and no access code.** The API has no authentication: anyone who knows the app's
  address can read and write the data.
- **UI with shadcn/ui** (Radix + Tailwind). The components live in `src/components/ui`, and the color
  tokens use shadcn's names (`design/DESIGN.md`, "Tokens").
- **Hosting on Vercel.**
- **Tests:** Vitest (unit) and Playwright (end to end, including offline mode).
- **Payments only by Pix and cash**, recorded by hand.

Schema rules:

- `uuid` IDs, accepting client-generated IDs.
- Money always in cents (`integer`), never decimal.
- `cantina_id` on every table.
- Nothing is deleted: use `ativo`, `fechado_em`, `cancelado_em`, status `cancelado` or `estornado_em`.
- Every table has `atualizado_em` and `seq`. `seq` comes from a global Postgres sequence
  (`sync_seq`), filled by a trigger on every insert and update, and is the sync cursor.
- The font (Poppins) is served by the app itself, without Google Fonts, so it works offline.
