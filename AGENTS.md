<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:kairali-pms -->

# Kairali PMS — project conventions

Publisher management system for Kairali Books (Malayalam book publisher).
Next.js 16 App Router + Route Handlers, PostgreSQL 17, Prisma 7.

## Database is the source of truth

The `kairali_pms` schema predates this app and holds real data. It was adopted
by introspection (`prisma db pull`), **not** generated from `schema.prisma`.

- Never run `prisma migrate dev` / `db push` against it without an explicit
  decision — that risks dropping the check constraints and existing rows.
- To change the schema: alter it in SQL, then `npm run db:pull` to resync.
- Table and column names are `snake_case`; Prisma models mirror them exactly.

## Non-obvious data conventions

- **Money is integer paise.** Never floats. Use `src/lib/money.ts`
  (`rupeesToPaise`, `formatPaise`, `pctOf`). Columns end in `_paise`.
- **Timestamps are UTC strings, not timestamp columns.**
  `'YYYY-MM-DD HH24:MI:SS'` for stamps, `'YYYY-MM-DD'` for dates. Always write
  via `src/lib/time.ts` (`stamp()`, `dateOnly()`); display with `formatIST()`.
- **IDs are app-generated UUIDs** (`randomUUID()`), not DB defaults.
- **Percentages are `real`** (`royalty_pct`, `discount_pct`) — apply them to
  paise with `pctOf()` so rounding stays in integer space.
- Document numbers come from the `counters` table (`invoice:2026`,
  `print_job:2026`), incremented inside the same transaction as the insert.

## Enforced value sets (DB check constraints)

Mirror these in Zod; the DB will reject anything else.

| Column | Allowed |
| --- | --- |
| `users.role` | `owner`, `accounts`, `store`, `production` |
| `titles.status` | `active`, `out_of_print` |
| `sales.type` | `sale`, `return` |
| `sales.channel` | `retail`, `dealer`, `fair`, `online` |
| `print_jobs.status` | `pending`, `printing`, `completed`, `cancelled` |
| `contracts.basis` | `mrp`, `net` |
| `stock_movements.reason` | `print_receipt`, `sale`, `return`, `adjustment`, `damage`, `opening`, `fair_out`, `fair_in` |

## Stock rule

`titles.stock` is a cached balance. Every change must also append a
`stock_movements` row carrying `qty_delta` and the resulting `balance_after`,
inside one `prisma.$transaction`. The ledger is the audit trail; the column is
only a fast read.

## Auth

DB-backed sessions, not JWT. The cookie holds an opaque random token; the
`sessions` table stores only its SHA-256, so sessions are revocable.

- Server components/layouts: `requireUser()` / `requireCapability(cap)`.
- Route handlers: `requireApiUser()` / `requireApiCapability(cap)`, wrapped in
  `handler()` from `src/lib/api.ts` for consistent error JSON.
- `src/proxy.ts` (Next 16 renamed `middleware`) only checks cookie *presence*
  at the edge — it cannot reach the database. Real validation is server-side.
- Permission checks go through capabilities in `src/lib/roles.ts`, never raw
  role string comparisons.
- Write an `audit()` entry for every mutation.

<!-- END:kairali-pms -->
