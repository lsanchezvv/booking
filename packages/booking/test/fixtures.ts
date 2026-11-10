import type { SlotRequest } from "../src/slots";
import type {
  AvailabilityContext,
  CapacityRuleRow,
  ExistingBooking,
  OfferingRow,
  RequirementRow,
  ScheduleRuleRow,
} from "../src/types";

export const NOW = new Date("2026-11-20T12:00:00Z");

export function offering(o: Partial<OfferingRow> & { id: string }): OfferingRow {
  return {
    duration_min: 60,
    buffer_before_min: 0,
    buffer_after_min: 0,
    slot_interval_min: null,
    price_minor: 100000,
    currency: "DOP",
    min_party: 1,
    max_party: 10,
    policy_id: null,
    active: true,
    ...o,
  };
}

export function requirement(r: Partial<RequirementRow> & { id: string; offering_id: string }): RequirementRow {
  return { pool_id: null, resource_id: null, quantity: 1, offset_min: 0, length_min: null, link_key: null, ...r };
}

export function rule(r: Partial<CapacityRuleRow> & Pick<CapacityRuleRow, "period" | "max_count">): CapacityRuleRow {
  return {
    id: `rule-${Math.random()}`,
    event_id: null,
    offering_id: null,
    resource_id: null,
    venue_id: null,
    unit: "bookings",
    per_customer: false,
    ...r,
  };
}

export function hours(scheduleId: string, weekdays: number[], start: string, end: string): ScheduleRuleRow[] {
  return weekdays.map((weekday) => ({ schedule_id: scheduleId, weekday, start_time: start, end_time: end }));
}

let bookingSeq = 0;

/** A booking at local Santo Domingo times (UTC-4) on one resource. */
export function booking(
  b: Partial<ExistingBooking> & { start: string; end: string; resourceId?: string; unit?: number },
): ExistingBooking {
  const { start, end, resourceId, unit, ...rest } = b;
  const startsAt = new Date(`${start}:00-04:00`).toISOString();
  const endsAt = new Date(`${end}:00-04:00`).toISOString();
  return {
    id: `booking-${++bookingSeq}`,
    customer_id: "customer",
    event_id: null,
    venue_id: "venue",
    status: "confirmed",
    starts_at: startsAt,
    ends_at: endsAt,
    party_size: 1,
    hold_expires_at: null,
    items: [{ offering_id: "offering" }],
    allocations: resourceId
      ? [{ resource_id: resourceId, unit: unit ?? 0, starts_at: startsAt, ends_at: endsAt, active: true }]
      : [],
    ...rest,
  };
}

/**
 * One venue open Mon–Fri 9:00–12:00 in Santo Domingo, one staff member, one
 * 60-minute offering on a 30-minute grid.
 */
export function baseContext(): AvailabilityContext {
  return {
    business: { id: "biz", timezone: "America/Santo_Domingo", slot_interval_min: 30, default_policy_id: "policy" },
    venues: [{ id: "venue", timezone: null, active: true }],
    resources: [{ id: "staff", venue_id: null, name: "Staff", capacity: 1, active: true, sort: 0 }],
    pools: [],
    poolMembers: [],
    offerings: [offering({ id: "offering" })],
    requirements: [requirement({ id: "req", offering_id: "offering", resource_id: "staff" })],
    events: [],
    eventOfferings: [],
    policies: [
      {
        id: "policy",
        approval_mode: "instant",
        min_lead_minutes: 0,
        max_advance_days: null,
        pending_counts_capacity: true,
      },
    ],
    schedules: [
      { id: "venue-hours", venue_id: "venue", resource_id: null, event_id: null, valid_from: null, valid_to: null },
    ],
    scheduleRules: hours("venue-hours", [1, 2, 3, 4, 5], "09:00", "12:00"),
    scheduleExceptions: [],
    timeOff: [],
    capacityRules: [],
    bookings: [],
  };
}

/** Tuesday 1 December 2026. */
export function request(r: Partial<SlotRequest> = {}): SlotRequest {
  return {
    venueId: "venue",
    items: [{ offeringId: "offering" }],
    from: "2026-12-01",
    to: "2026-12-01",
    now: NOW,
    ...r,
  };
}

/** Local `HH:MM` start times in Santo Domingo. */
export function localStarts(slots: { startsAt: string }[]): string[] {
  return slots.map((s) => {
    const local = new Date(Date.parse(s.startsAt) - 4 * 3_600_000);
    return local.toISOString().slice(11, 16);
  });
}
