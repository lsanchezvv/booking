import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type BookingClient = SupabaseClient<Database, "booking">;

/** Server-only: the booking schema is readable by service_role alone. */
export function createBookingClient(url: string, serviceRoleKey: string): BookingClient {
  return createClient<Database, "booking">(url, serviceRoleKey, {
    db: { schema: "booking" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
