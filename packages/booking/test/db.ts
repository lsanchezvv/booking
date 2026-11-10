import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createBookingClient, type BookingClient } from "../src/client";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

/** The local stack from `pnpm supabase:start`, or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY if set. */
export function localClient(): BookingClient {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const status = JSON.parse(
      execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as { API_URL: string; SERVICE_ROLE_KEY: string };
    url = status.API_URL;
    key = status.SERVICE_ROLE_KEY;
  }
  return createBookingClient(url, key);
}
