# Kairali PMS

Publisher management system for Kairali Books — titles, authors, royalty
contracts, dealers, sales, stock and print jobs.

**Stack:** Next.js 16 (App Router + Route Handlers) · React 19 · Tailwind 4 ·
PostgreSQL 17 · Prisma 7 (`@prisma/adapter-pg`) · TypeScript

## Getting started

```bash
npm install
npm run dev
```

The app expects a local PostgreSQL database named `kairali_pms`. Connection and
secrets live in `.env` (untracked):

```
DATABASE_URL="postgresql://<user>@localhost:5432/kairali_pms?schema=public"
JWT_SECRET="..."           # reserved; sessions are DB-backed
SESSION_COOKIE_NAME="kairali_session"
SESSION_TTL_HOURS="12"
```

### Signing in

Four accounts already exist (`owner@`, `accounts@`, `store@`, `press@`
`kairalibooks.in`). If you don't know a password, set one:

```bash
npm run user:set -- owner@kairalibooks.in "Radhika Menon" owner "your-password"
```

That command creates the user if missing, otherwise resets the password — and
revokes existing sessions and any lockout.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:pull` | Re-introspect the DB and regenerate the Prisma client |
| `npm run db:studio` | Prisma Studio |
| `npm run user:set` | Create a user / reset a password |

## Layout

```
src/
  app/
    (app)/            authenticated shell — sidebar, header, dashboard
    login/            sign-in page
    api/auth/         login · logout · me
  components/         shared UI
  lib/
    prisma.ts         Prisma client singleton (pg adapter)
    auth.ts           credential check, lockout, route guards
    session.ts        opaque-token sessions (SHA-256 in DB)
    roles.ts          roles → capabilities
    money.ts          integer-paise helpers
    time.ts           UTC string timestamps + IST display
    api.ts            route-handler error wrapper
    audit.ts          activity trail
    nav.ts            sidebar model
  proxy.ts            edge cookie gate (Next 16 successor to middleware)
```

## Working on this codebase

Read `AGENTS.md` first. The database schema predates the app and holds real
data — it is adopted by introspection, so **do not run Prisma migrations**
against it without a deliberate decision. Money is integer paise, timestamps
are UTC strings, and stock changes must always append a `stock_movements` row.
