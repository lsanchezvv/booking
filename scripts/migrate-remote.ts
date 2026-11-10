// Applies supabase/migrations to a hosted database that other repos also
// migrate (the photo site shares the Supabase project). `supabase db push`
// can't be used there: it keeps one history per project and refuses to run
// when it finds another repo's versions. This script keeps its own history in
// booking_migrations.schema_migrations instead.
//
//   BOOKING_DATABASE_URL="postgres://..." pnpm db:migrate:remote [--dry-run]

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const migrationsDir = fileURLToPath(new URL("../supabase/migrations", import.meta.url));
const dryRun = process.argv.includes("--dry-run");

const url = process.env.BOOKING_DATABASE_URL;
if (!url) {
  console.error("Set BOOKING_DATABASE_URL to the hosted database's session pooler URL.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`create schema if not exists booking_migrations`;
  await sql`revoke all on schema booking_migrations from public`;
  await sql`
    create table if not exists booking_migrations.schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql<{ version: string }[]>`select version from booking_migrations.schema_migrations`).map((r) => r.version),
  );
  const files = (await readdir(migrationsDir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const pending = files.filter((f) => !applied.has(f.split("_")[0]!));

  if (pending.length === 0) console.log("Up to date.");

  for (const file of pending) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    if (dryRun) {
      console.log(`Would apply ${file}`);
      continue;
    }
    const body = await readFile(join(migrationsDir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into booking_migrations.schema_migrations (version, name) values (${version!}, ${rest.join("_")})`;
    });
    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end();
}
