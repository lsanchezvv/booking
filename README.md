# Booking service

Appointments, availability and capacity for any business that takes bookings. The photography site is the first client. Schema and design: [docs/schema.md](docs/schema.md).

```
apps/api           Next.js app deployed on Vercel. Will host the HTTP API.
packages/booking   Slot finder, policy resolution, data loading, generated DB types.
supabase/          Migrations for the `booking` schema and the reference seed.
scripts/           Migration runner for the shared hosted database.
```

## Local development

Needs Docker, Node 24 and pnpm 10.

```sh
pnpm install
pnpm supabase:start   # local stack on ports 553xx, so it runs next to melvin-photo's 543xx
pnpm db:reset         # re-apply migrations and supabase/seed.sql
pnpm test             # unit tests + slot tests against the seeded database
pnpm dev              # apps/api on http://localhost:3100
```

Studio is at http://127.0.0.1:55323.

After changing a migration, run `pnpm db:reset && pnpm db:types` to refresh `packages/booking/src/database.types.ts`.

## Hosted database

The `booking` schema lives in the same Supabase project as the photo site, which has its own migrations. `supabase db push` keeps one migration history per project, so neither repo can use it without tripping over the other's versions. Apply this repo's migrations with:

```sh
BOOKING_DATABASE_URL="postgres://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  pnpm db:migrate:remote --dry-run   # then without --dry-run
```

It records versions in `booking_migrations.schema_migrations`.

The API reads the schema through PostgREST, so add `booking` to **Project Settings → API → Exposed schemas** once per project. Only `service_role` has grants, so exposing it doesn't open it to `anon` or `authenticated`.

## Vercel

The project builds `apps/api`. Set the Vercel project's Root Directory to `apps/api`.
