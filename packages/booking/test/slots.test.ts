import { describe, expect, it } from "vitest";

import { BookingError } from "../src/errors";
import { findSlots } from "../src/slots";
import type { AvailabilityContext, EventRow } from "../src/types";
import { baseContext, booking, hours, localStarts, offering, request, requirement, rule } from "./fixtures";

function withEvent(ctx: AvailabilityContext, overrides: Partial<EventRow> = {}): AvailabilityContext {
  ctx.events = [
    {
      id: "event",
      venue_id: "venue",
      status: "published",
      starts_on: "2026-12-01",
      ends_on: "2026-12-31",
      publish_at: null,
      closes_at: null,
      policy_id: null,
      slot_mode: "grid",
      slot_interval_min: 30,
      ...overrides,
    },
  ];
  ctx.eventOfferings = [
    {
      event_id: "event",
      offering_id: "offering",
      price_minor: null,
      duration_min: null,
      policy_id: null,
      active: true,
    },
  ];
  return ctx;
}

describe("grid and opening hours", () => {
  it("offers every grid start whose service fits inside opening hours", () => {
    const slots = findSlots(baseContext(), request());
    expect(localStarts(slots)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(slots[0]).toMatchObject({
      startsAt: "2026-12-01T13:00:00.000Z",
      endsAt: "2026-12-01T14:00:00.000Z",
      remaining: null,
      items: [
        {
          offeringId: "offering",
          priceMinor: 100000,
          currency: "DOP",
          allocations: [{ resourceId: "staff", unit: 0 }],
        },
      ],
    });
  });

  it("is closed on days without hours", () => {
    expect(findSlots(baseContext(), request({ from: "2026-12-05", to: "2026-12-06" }))).toEqual([]);
  });

  it("is closed when nothing has a schedule", () => {
    const ctx = baseContext();
    ctx.schedules = [];
    ctx.scheduleRules = [];
    expect(findSlots(ctx, request())).toEqual([]);
  });

  it("uses resource hours alone when the venue has none", () => {
    const ctx = baseContext();
    ctx.schedules = [
      { id: "staff-hours", venue_id: null, resource_id: "staff", event_id: null, valid_from: null, valid_to: null },
    ];
    ctx.scheduleRules = hours("staff-hours", [2], "14:00", "16:00");
    expect(localStarts(findSlots(ctx, request()))).toEqual(["14:00", "14:30", "15:00"]);
  });

  it("applies closed and open exceptions", () => {
    const ctx = baseContext();
    ctx.scheduleExceptions = [
      { schedule_id: "venue-hours", date: "2026-12-01", kind: "closed", start_time: "10:00", end_time: "11:00" },
      { schedule_id: "venue-hours", date: "2026-12-01", kind: "open", start_time: "15:00", end_time: "16:00" },
    ];
    expect(localStarts(findSlots(ctx, request()))).toEqual(["09:00", "11:00", "15:00"]);
  });

  it("converts wall time per date across a DST change", () => {
    const ctx = baseContext();
    ctx.business.timezone = "America/New_York";
    ctx.scheduleRules = hours("venue-hours", [0, 6], "09:00", "10:00");
    const slots = findSlots(
      ctx,
      request({ from: "2026-03-07", to: "2026-03-08", now: new Date("2026-03-01T00:00:00Z") }),
    );
    expect(slots.map((s) => s.startsAt)).toEqual(["2026-03-07T14:00:00.000Z", "2026-03-08T13:00:00.000Z"]);
  });
});

describe("booking window", () => {
  it("respects the minimum lead time", () => {
    const ctx = baseContext();
    const now = new Date("2026-12-01T13:45:00Z");
    expect(localStarts(findSlots(ctx, request({ now })))).toEqual(["10:00", "10:30", "11:00"]);
    ctx.policies[0]!.min_lead_minutes = 60;
    expect(localStarts(findSlots(ctx, request({ now })))).toEqual(["11:00"]);
  });

  it("respects the maximum advance", () => {
    const ctx = baseContext();
    ctx.policies[0]!.max_advance_days = 5;
    expect(findSlots(ctx, request())).toEqual([]);
  });
});

describe("resources", () => {
  it("blocks time held by existing allocations and keeps buffers around new ones", () => {
    const ctx = baseContext();
    ctx.offerings = [offering({ id: "offering", buffer_after_min: 30 })];
    ctx.bookings = [booking({ start: "2026-12-01T10:00", end: "2026-12-01T11:00", resourceId: "staff" })];
    const slots = findSlots(ctx, request());
    expect(localStarts(slots)).toEqual(["11:00"]);
    expect(slots[0]!.items[0]!.allocations[0]).toMatchObject({
      startsAt: "2026-12-01T15:00:00.000Z",
      endsAt: "2026-12-01T16:30:00.000Z",
    });
  });

  it("ignores holds that have expired and bookings that are no longer active", () => {
    const ctx = baseContext();
    ctx.bookings = [
      booking({
        start: "2026-12-01T09:00",
        end: "2026-12-01T10:00",
        resourceId: "staff",
        status: "hold",
        hold_expires_at: "2026-11-19T00:00:00Z",
      }),
      booking({ start: "2026-12-01T10:00", end: "2026-12-01T11:00", resourceId: "staff", status: "cancelled" }),
    ];
    expect(localStarts(findSlots(ctx, request()))).toHaveLength(5);
  });

  it("uses each unit of a resource with capacity above one", () => {
    const ctx = baseContext();
    ctx.resources = [{ id: "room", venue_id: "venue", name: "Room", capacity: 2, active: true, sort: 0 }];
    ctx.requirements = [requirement({ id: "req", offering_id: "offering", resource_id: "room" })];
    ctx.bookings = [booking({ start: "2026-12-01T09:00", end: "2026-12-01T10:00", resourceId: "room", unit: 0 })];
    expect(findSlots(ctx, request())[0]!.items[0]!.allocations[0]).toMatchObject({ resourceId: "room", unit: 1 });

    ctx.bookings.push(booking({ start: "2026-12-01T09:00", end: "2026-12-01T10:00", resourceId: "room", unit: 1 }));
    expect(localStarts(findSlots(ctx, request()))[0]).toBe("10:00");
  });

  it("needs distinct resources for a quantity above one", () => {
    const ctx = baseContext();
    ctx.resources = ["a", "b", "c"].map((id, sort) => ({
      id,
      venue_id: null,
      name: id,
      capacity: 1,
      active: true,
      sort,
    }));
    ctx.pools = [{ id: "pool", selection: "any" }];
    ctx.poolMembers = ["a", "b", "c"].map((resource_id) => ({ pool_id: "pool", resource_id }));
    ctx.requirements = [requirement({ id: "req", offering_id: "offering", pool_id: "pool", quantity: 2 })];
    ctx.bookings = [booking({ start: "2026-12-01T09:00", end: "2026-12-01T10:00", resourceId: "a" })];

    const [first] = findSlots(ctx, request());
    expect(first!.items[0]!.allocations.map((a) => a.resourceId).sort()).toEqual(["b", "c"]);

    ctx.bookings.push(booking({ start: "2026-12-01T09:00", end: "2026-12-01T10:00", resourceId: "b" }));
    expect(localStarts(findSlots(ctx, request()))[0]).toBe("10:00");
  });

  it("only accepts a resource choice for pools that allow it", () => {
    const ctx = baseContext();
    ctx.pools = [{ id: "pool", selection: "any" }];
    ctx.poolMembers = [{ pool_id: "pool", resource_id: "staff" }];
    expect(() => findSlots(ctx, request({ resourceChoices: { pool: "staff" } }))).toThrow(BookingError);
  });

  it("subtracts time off for the business, the venue and the resource", () => {
    const ctx = baseContext();
    ctx.timeOff = [
      {
        venue_id: null,
        resource_id: null,
        event_id: null,
        starts_at: "2026-12-01T13:00:00Z",
        ends_at: "2026-12-01T13:30:00Z",
      },
      {
        venue_id: null,
        resource_id: "staff",
        event_id: null,
        starts_at: "2026-12-01T15:00:00Z",
        ends_at: "2026-12-01T16:00:00Z",
      },
    ];
    expect(localStarts(findSlots(ctx, request()))).toEqual(["09:30", "10:00"]);
  });
});

describe("capacity rules", () => {
  it("stops at an event's total limit and reports what is left", () => {
    const ctx = withEvent(baseContext());
    ctx.capacityRules = [rule({ event_id: "event", period: "total", max_count: 160 })];
    ctx.bookings = Array.from({ length: 159 }, () =>
      booking({ start: "2026-11-30T09:00", end: "2026-11-30T10:00", event_id: "event" }),
    );
    const slots = findSlots(ctx, request({ eventId: "event" }));
    expect(slots).toHaveLength(5);
    expect(slots.every((s) => s.remaining === 1)).toBe(true);

    ctx.bookings.push(booking({ start: "2026-11-30T09:00", end: "2026-11-30T10:00", event_id: "event" }));
    expect(findSlots(ctx, request({ eventId: "event" }))).toEqual([]);
  });

  it("applies the strictest of several rules", () => {
    const ctx = withEvent(baseContext());
    ctx.capacityRules = [
      rule({ event_id: "event", period: "total", max_count: 160 }),
      rule({ event_id: "event", period: "day", max_count: 2 }),
    ];
    ctx.bookings = [booking({ start: "2026-12-01T11:00", end: "2026-12-01T12:00", event_id: "event" })];
    const slots = findSlots(ctx, request({ eventId: "event" }));
    expect(slots.map((s) => s.remaining)).toEqual([1, 1, 1, 1, 1]);
  });

  it("counts people per slot", () => {
    const ctx = baseContext();
    ctx.capacityRules = [rule({ offering_id: "offering", period: "slot", unit: "people", max_count: 6 })];
    ctx.bookings = [booking({ start: "2026-12-01T09:00", end: "2026-12-01T10:00", party_size: 4 })];
    expect(localStarts(findSlots(ctx, request({ partySize: 3 })))).toEqual(["10:00", "10:30", "11:00"]);
    expect(localStarts(findSlots(ctx, request({ partySize: 2 })))).toHaveLength(5);
  });

  it("limits a single customer when the rule is per customer", () => {
    const ctx = withEvent(baseContext());
    ctx.capacityRules = [rule({ event_id: "event", period: "total", max_count: 1, per_customer: true })];
    ctx.bookings = [
      booking({ start: "2026-12-02T09:00", end: "2026-12-02T10:00", event_id: "event", customer_id: "c1" }),
    ];
    expect(findSlots(ctx, request({ eventId: "event", customerId: "c1" }))).toEqual([]);
    expect(findSlots(ctx, request({ eventId: "event", customerId: "c2" }))).toHaveLength(5);
  });

  it("counts pending bookings only when the policy says so", () => {
    const ctx = baseContext();
    ctx.capacityRules = [rule({ venue_id: "venue", period: "day", max_count: 1 })];
    ctx.bookings = [booking({ start: "2026-12-01T09:00", end: "2026-12-01T10:00", status: "pending" })];
    expect(findSlots(ctx, request())).toEqual([]);
    ctx.policies[0]!.pending_counts_capacity = false;
    expect(findSlots(ctx, request())).toHaveLength(5);
  });
});

describe("events", () => {
  it("is closed outside the event dates and before it is published", () => {
    expect(findSlots(withEvent(baseContext(), { starts_on: "2026-12-02" }), request({ eventId: "event" }))).toEqual([]);
    expect(findSlots(withEvent(baseContext(), { status: "draft" }), request({ eventId: "event" }))).toEqual([]);
    expect(
      findSlots(withEvent(baseContext(), { publish_at: "2026-11-25T00:00:00Z" }), request({ eventId: "event" })),
    ).toEqual([]);
  });

  it("uses event overrides for duration and price", () => {
    const ctx = withEvent(baseContext());
    ctx.eventOfferings[0] = { ...ctx.eventOfferings[0]!, duration_min: 30, price_minor: 50000 };
    const slots = findSlots(ctx, request({ eventId: "event" }));
    expect(localStarts(slots)).toHaveLength(6);
    expect(slots[0]!.items[0]!.priceMinor).toBe(50000);
  });

  it("rejects offerings that are not part of the event", () => {
    const ctx = withEvent(baseContext());
    ctx.eventOfferings = [];
    expect(() => findSlots(ctx, request({ eventId: "event" }))).toThrow(/not offered in event/);
  });
});
