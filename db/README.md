# Database

The baseline `kairali_pms` schema (users, authors, titles, contracts, dealers,
sales, stock, print jobs, payouts, audit) **predates this repository** and holds
real data. It was adopted into Prisma by introspection, not generated from
`schema.prisma`.

Because of that, **do not run `prisma migrate` or `prisma db push`.** They would
plan against an empty history and can drop the check constraints and data.

## Changing the schema

1. Write a numbered SQL file in `db/migrations/`.
2. Apply it: `psql -d kairali_pms -f db/migrations/00X_name.sql`
3. Resync Prisma: `npm run db:pull`

Every migration should be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
and wrapped in a transaction.

| File | Adds |
| --- | --- |
| `001_submissions.sql` | Flow 7 — `submissions`, `email_outbox`, `submission_throttle` |
