import type { BookingClient } from "./client";
import { BookingError } from "./errors";
import { addDays, type LocalDate } from "./time";
import type { AvailabilityContext, ExistingBooking } from "./types";

const PAGE_SIZE = 1000;
const ACTIVE_STATUSES = ["hold", "pending", "confirmed"] as const;

type Result<T> = { data: T | null; error: { message: string } | null };

function must<T>(what: string, { data, error }: Result<T>): T {
  if (error) throw new BookingError("database", `Loading ${what} failed: ${error.message}`);
  if (data === null) throw new BookingError("not_found", `${what} not found`);
  return data;
}

/** PostgREST caps each response at max_rows, so read until a short page. */
async function all<T>(what: string, page: (from: number, to: number) => PromiseLike<Result<T[]>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const batch = must(what, await page(from, from + PAGE_SIZE - 1));
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/**
 * Reads what `findSlots` needs for one business and a range of local dates.
 * Bookings are loaded a week either side of the range so day and week rules
 * see every booking in their window; `total` rules widen that to all of the
 * event's bookings, or all of the business's for non-event totals.
 */
export async function loadAvailabilityContext(
  db: BookingClient,
  params: { businessId: string; from: LocalDate; to: LocalDate },
): Promise<AvailabilityContext> {
  const { businessId } = params;
  const rangeStart = `${addDays(params.from, -8)}T00:00:00Z`;
  const rangeEnd = `${addDays(params.to, 9)}T00:00:00Z`;

  const [
    business,
    venues,
    resources,
    pools,
    poolMembers,
    offerings,
    requirements,
    events,
    eventOfferings,
    policies,
    schedules,
    scheduleRules,
    scheduleExceptions,
    timeOff,
    capacityRules,
  ] = await Promise.all([
    db
      .from("business")
      .select("id, timezone, slot_interval_min, default_policy_id")
      .eq("id", businessId)
      .maybeSingle()
      .then((r) => must("business", r)),
    db
      .from("venue")
      .select("id, timezone, active")
      .eq("business_id", businessId)
      .then((r) => must("venues", r)),
    db
      .from("resource")
      .select("id, venue_id, name, capacity, active, sort")
      .eq("business_id", businessId)
      .then((r) => must("resources", r)),
    db
      .from("resource_pool")
      .select("id, selection")
      .eq("business_id", businessId)
      .then((r) => must("pools", r)),
    db
      .from("resource_pool_member")
      .select("pool_id, resource_id")
      .eq("business_id", businessId)
      .then((r) => must("pool members", r)),
    db
      .from("offering")
      .select(
        "id, duration_min, buffer_before_min, buffer_after_min, slot_interval_min, price_minor, currency, min_party, max_party, policy_id, active",
      )
      .eq("business_id", businessId)
      .then((r) => must("offerings", r)),
    db
      .from("offering_requirement")
      .select("id, offering_id, pool_id, resource_id, quantity, offset_min, length_min, link_key")
      .eq("business_id", businessId)
      .then((r) => must("requirements", r)),
    db
      .from("event")
      .select(
        "id, venue_id, status, starts_on, ends_on, publish_at, closes_at, policy_id, slot_mode, slot_interval_min",
      )
      .eq("business_id", businessId)
      .then((r) => must("events", r)),
    db
      .from("event_offering")
      .select("event_id, offering_id, price_minor, duration_min, policy_id, active")
      .eq("business_id", businessId)
      .then((r) => must("event offerings", r)),
    db
      .from("booking_policy")
      .select("id, approval_mode, min_lead_minutes, max_advance_days, pending_counts_capacity")
      .eq("business_id", businessId)
      .then((r) => must("policies", r)),
    db
      .from("schedule")
      .select("id, venue_id, resource_id, event_id, valid_from, valid_to")
      .eq("business_id", businessId)
      .then((r) => must("schedules", r)),
    all("schedule rules", (from, to) =>
      db
        .from("schedule_rule")
        .select("schedule_id, weekday, start_time, end_time")
        .eq("business_id", businessId)
        .order("id")
        .range(from, to),
    ),
    all("schedule exceptions", (from, to) =>
      db
        .from("schedule_exception")
        .select("schedule_id, date, kind, start_time, end_time")
        .eq("business_id", businessId)
        .gte("date", addDays(params.from, -1))
        .lte("date", addDays(params.to, 1))
        .order("id")
        .range(from, to),
    ),
    all("time off", (from, to) =>
      db
        .from("time_off")
        .select("venue_id, resource_id, event_id, starts_at, ends_at")
        .eq("business_id", businessId)
        .lt("starts_at", rangeEnd)
        .gt("ends_at", rangeStart)
        .order("id")
        .range(from, to),
    ),
    db
      .from("capacity_rule")
      .select("id, event_id, offering_id, resource_id, venue_id, period, unit, max_count, per_customer")
      .eq("business_id", businessId)
      .then((r) => must("capacity rules", r)),
  ]);

  const totals = capacityRules.filter((r) => r.period === "total");
  const loadEverything = totals.some((r) => r.event_id === null);
  const totalEventIds = [...new Set(totals.flatMap((r) => (r.event_id ? [r.event_id] : [])))];

  const bookings: ExistingBooking[] = await all("bookings", (from, to) => {
    let query = db
      .from("booking")
      .select(
        "id, customer_id, event_id, venue_id, status, starts_at, ends_at, party_size, hold_expires_at, items:booking_item(offering_id), allocations:booking_allocation(resource_id, unit, starts_at, ends_at, active)",
      )
      .eq("business_id", businessId)
      .in("status", [...ACTIVE_STATUSES]);
    if (!loadEverything) {
      const inRange = `and(starts_at.lt.${rangeEnd},ends_at.gt.${rangeStart})`;
      query =
        totalEventIds.length > 0
          ? query.or(`${inRange},event_id.in.(${totalEventIds.join(",")})`)
          : query.lt("starts_at", rangeEnd).gt("ends_at", rangeStart);
    }
    return query.order("id").range(from, to);
  });

  return {
    business,
    venues,
    resources,
    pools,
    poolMembers,
    offerings,
    requirements,
    events,
    eventOfferings,
    policies,
    schedules,
    scheduleRules,
    scheduleExceptions,
    timeOff,
    capacityRules,
    bookings,
  };
}
