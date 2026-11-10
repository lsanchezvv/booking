import { BookingError } from "./errors";
import { covers, intersect, normalize, overlaps, subtract, type Interval } from "./intervals";
import { combinePolicies, resolvePolicy } from "./policy";
import {
  DAY_MS,
  MINUTE_MS,
  eachDate,
  instantToLocalDate,
  localToInstant,
  startOfWeek,
  timeToMinutes,
  weekday,
  type LocalDate,
} from "./time";
import type {
  AvailabilityContext,
  CapacityRuleRow,
  EventRow,
  ExistingBooking,
  OfferingRow,
  RequirementRow,
  ResourceRow,
  ScheduleRow,
} from "./types";

export type Arrangement = "sequential" | "parallel";

export interface SlotRequest {
  /** Required without an event. With an event, the event's venue is used. */
  venueId?: string;
  eventId?: string;
  items: { offeringId: string }[];
  /** `sequential` (default) runs items back to back; `parallel` starts them together. */
  arrangement?: Arrangement;
  /** Pool id to resource id, only for pools whose selection is `customer_choice`. */
  resourceChoices?: Record<string, string>;
  partySize?: number;
  /** Needed to apply per-customer capacity rules. */
  customerId?: string;
  /** Local dates in the venue's time zone, both included. */
  from: LocalDate;
  to: LocalDate;
  now: Date;
}

export interface SlotAllocation {
  resourceId: string;
  unit: number;
  /** Includes buffers. */
  startsAt: string;
  endsAt: string;
}

export interface SlotItem {
  offeringId: string;
  startsAt: string;
  endsAt: string;
  priceMinor: number | null;
  currency: string;
  allocations: SlotAllocation[];
}

export interface Slot {
  startsAt: string;
  endsAt: string;
  /** Bookings left under the tightest booking-count rule, or null when no rule applies. */
  remaining: number | null;
  items: SlotItem[];
}

const ACTIVE_STATUSES = new Set(["hold", "pending", "confirmed"]);
const FLEXIBLE_STEP_MIN = 5;

interface PlannedItem {
  offering: OfferingRow;
  offsetMin: number;
  durationMin: number;
  priceMinor: number | null;
}

interface Segment {
  itemIndex: number;
  startMin: number;
  endMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

/** Segments that must be served by one resource, and who may serve them. */
interface Group {
  segments: Segment[];
  candidates: string[];
  /** Groups from the same multi-quantity requirement must use different resources. */
  distinctTag: string | null;
}

interface Placement {
  groupIndex: number;
  segment: Segment;
  resourceId: string;
  unit: number;
  held: Interval;
}

interface CountedBooking {
  booking: ExistingBooking;
  range: Interval;
  date: LocalDate;
  week: LocalDate;
  offeringIds: Set<string>;
  resourceIds: Set<string>;
}

interface Scope {
  eventId: string | null;
  venueId: string;
  offeringIds: Set<string>;
}

export function findSlots(ctx: AvailabilityContext, req: SlotRequest): Slot[] {
  if (req.items.length === 0) throw new BookingError("invalid_request", "At least one item is required");
  const nowMs = req.now.getTime();
  const partySize = req.partySize ?? 1;
  const arrangement = req.arrangement ?? "sequential";

  const event = req.eventId ? ctx.events.find((e) => e.id === req.eventId) : undefined;
  if (req.eventId && !event) throw new BookingError("not_found", `Event ${req.eventId} not found`);
  if (event && req.venueId && req.venueId !== event.venue_id) {
    throw new BookingError("invalid_request", "venueId does not match the event's venue");
  }
  if (event && !isEventOpen(event, nowMs)) return [];

  const venueId = event?.venue_id ?? req.venueId;
  if (!venueId) throw new BookingError("invalid_request", "venueId is required without an event");
  const venue = ctx.venues.find((v) => v.id === venueId);
  if (!venue) throw new BookingError("not_found", `Venue ${venueId} not found`);
  if (!venue.active) return [];
  const tz = venue.timezone ?? ctx.business.timezone;

  const items = planItems(ctx, req, event, arrangement, partySize);
  const totalMin =
    arrangement === "parallel"
      ? Math.max(...items.map((i) => i.durationMin))
      : items.reduce((sum, i) => sum + i.durationMin, 0);
  const policy = combinePolicies(items.map((i) => resolvePolicy(ctx, i.offering.id, event?.id)));
  const stepMin =
    event?.slot_mode === "flexible"
      ? FLEXIBLE_STEP_MIN
      : (event?.slot_interval_min ?? items[0]!.offering.slot_interval_min ?? ctx.business.slot_interval_min);

  const resources = new Map(ctx.resources.map((r) => [r.id, r]));
  const groups = buildGroups(ctx, req, items, arrangement, resources, venueId);
  if (groups.some((g) => g.candidates.length === 0)) return [];

  const reserving = ctx.bookings.filter((b) => reservesTime(b, nowMs));
  const busy = new Map<string, { unit: number; range: Interval }[]>();
  const dailyLoad = new Map<string, Set<string>>();
  for (const b of reserving) {
    for (const a of b.allocations) {
      if (!a.active) continue;
      const range: Interval = [Date.parse(a.starts_at), Date.parse(a.ends_at)];
      pushTo(busy, a.resource_id, { unit: a.unit, range });
      const key = `${a.resource_id}|${instantToLocalDate(Date.parse(b.starts_at), tz)}`;
      if (!dailyLoad.has(key)) dailyLoad.set(key, new Set());
      dailyLoad.get(key)!.add(b.id);
    }
  }

  const counted: CountedBooking[] = reserving
    .filter((b) => b.status !== "pending" || policy.pending_counts_capacity)
    .map((b) => {
      const range: Interval = [Date.parse(b.starts_at), Date.parse(b.ends_at)];
      const date = instantToLocalDate(range[0], tz);
      return {
        booking: b,
        range,
        date,
        week: startOfWeek(date),
        offeringIds: new Set(b.items.map((i) => i.offering_id)),
        resourceIds: new Set(b.allocations.filter((a) => a.active).map((a) => a.resource_id)),
      };
    });

  const scope: Scope = {
    eventId: event?.id ?? null,
    venueId,
    offeringIds: new Set(items.map((i) => i.offering.id)),
  };
  const rules = ctx.capacityRules.filter((r) => !r.per_customer || req.customerId);
  const bookingRules = rules.filter((r) => r.resource_id === null && ruleCoversRequest(r, scope));
  const resourceRules = rules.filter((r) => r.resource_id !== null);

  const earliest = nowMs + policy.min_lead_minutes * MINUTE_MS;
  const latest = policy.max_advance_days === null ? Infinity : nowMs + policy.max_advance_days * DAY_MS;

  const slots: Slot[] = [];

  for (const date of eachDate(req.from, req.to)) {
    if (event && (date < event.starts_on || date > event.ends_on)) continue;

    const blocks = ctx.timeOff
      .filter(
        (t) =>
          (t.venue_id === null && t.resource_id === null && t.event_id === null) ||
          t.venue_id === venueId ||
          (event !== undefined && t.event_id === event.id),
      )
      .map((t): Interval => [Date.parse(t.starts_at), Date.parse(t.ends_at)]);

    const venueOpen = ownerOpen(ctx, "venue_id", venueId, date, tz);
    const eventOpen = event ? ownerOpen(ctx, "event_id", event.id, date, tz) : null;
    const baseRaw = combine(venueOpen, eventOpen);
    const base = baseRaw === null ? null : subtract(baseRaw, blocks);
    if (base === null && groups.length === 0) continue;

    const resourceOpenCache = new Map<string, Interval[]>();
    const resourceOpen = (resourceId: string): Interval[] => {
      let open = resourceOpenCache.get(resourceId);
      if (!open) {
        const own = combine(baseRaw, ownerOpen(ctx, "resource_id", resourceId, date, tz));
        const resourceBlocks = ctx.timeOff
          .filter((t) => t.resource_id === resourceId)
          .map((t): Interval => [Date.parse(t.starts_at), Date.parse(t.ends_at)]);
        open = own === null ? [] : subtract(own, [...blocks, ...resourceBlocks]);
        resourceOpenCache.set(resourceId, open);
      }
      return open;
    };

    const week = startOfWeek(date);

    for (let minute = 0; minute < 24 * 60; minute += stepMin) {
      const start = localToInstant(date, minute, tz);
      if (start < earliest || start > latest) continue;
      const span: Interval = [start, start + totalMin * MINUTE_MS];
      if (base !== null && !covers(base, span)) continue;

      const window = { span, date, week };
      if (
        !bookingRules.every((r) => usage(r, counted, window, req.customerId) + increment(r, partySize) <= r.max_count)
      ) {
        continue;
      }

      const placements = assign(groups, start, {
        resourceOpen,
        resources,
        busy,
        load: (resourceId) => dailyLoad.get(`${resourceId}|${date}`)?.size ?? 0,
        resourceAllowed: (resourceId) =>
          resourceRules
            .filter((r) => r.resource_id === resourceId)
            .every((r) => usage(r, counted, window, req.customerId) + increment(r, partySize) <= r.max_count),
      });
      if (!placements) continue;

      const assigned = new Set(placements.map((p) => p.resourceId));
      const remaining = [...bookingRules, ...resourceRules.filter((r) => assigned.has(r.resource_id!))]
        .filter((r) => r.unit === "bookings" && !r.per_customer)
        .map((r) => r.max_count - usage(r, counted, window, req.customerId));

      slots.push({
        startsAt: iso(span[0]),
        endsAt: iso(span[1]),
        remaining: remaining.length > 0 ? Math.min(...remaining) : null,
        items: items.map((item, itemIndex) => ({
          offeringId: item.offering.id,
          startsAt: iso(start + item.offsetMin * MINUTE_MS),
          endsAt: iso(start + (item.offsetMin + item.durationMin) * MINUTE_MS),
          priceMinor: item.priceMinor,
          currency: item.offering.currency,
          allocations: placements
            .filter((p) => p.segment.itemIndex === itemIndex)
            .sort((a, b) => a.held[0] - b.held[0])
            .map((p) => ({
              resourceId: p.resourceId,
              unit: p.unit,
              startsAt: iso(p.held[0]),
              endsAt: iso(p.held[1]),
            })),
        })),
      });
    }
  }

  return slots;
}

function isEventOpen(event: EventRow, nowMs: number): boolean {
  return (
    event.status === "published" &&
    (event.publish_at === null || Date.parse(event.publish_at) <= nowMs) &&
    (event.closes_at === null || Date.parse(event.closes_at) > nowMs)
  );
}

function reservesTime(b: ExistingBooking, nowMs: number): boolean {
  if (!ACTIVE_STATUSES.has(b.status)) return false;
  return !(b.status === "hold" && b.hold_expires_at !== null && Date.parse(b.hold_expires_at) <= nowMs);
}

function planItems(
  ctx: AvailabilityContext,
  req: SlotRequest,
  event: EventRow | undefined,
  arrangement: Arrangement,
  partySize: number,
): PlannedItem[] {
  let offsetMin = 0;
  return req.items.map(({ offeringId }) => {
    const offering = ctx.offerings.find((o) => o.id === offeringId);
    if (!offering) throw new BookingError("not_found", `Offering ${offeringId} not found`);
    if (!offering.active) throw new BookingError("invalid_request", `Offering ${offeringId} is not active`);
    if (partySize < offering.min_party || partySize > offering.max_party) {
      throw new BookingError(
        "invalid_request",
        `Party size ${partySize} is outside ${offering.min_party}–${offering.max_party} for offering ${offeringId}`,
      );
    }

    const eventOffering = event
      ? ctx.eventOfferings.find((eo) => eo.event_id === event.id && eo.offering_id === offeringId)
      : undefined;
    if (event && !eventOffering?.active) {
      throw new BookingError("invalid_request", `Offering ${offeringId} is not offered in event ${event.id}`);
    }

    const durationMin = eventOffering?.duration_min ?? offering.duration_min;
    const item: PlannedItem = {
      offering,
      offsetMin: arrangement === "parallel" ? 0 : offsetMin,
      durationMin,
      priceMinor: eventOffering?.price_minor ?? offering.price_minor,
    };
    offsetMin += durationMin;
    return item;
  });
}

function buildGroups(
  ctx: AvailabilityContext,
  req: SlotRequest,
  items: PlannedItem[],
  arrangement: Arrangement,
  resources: Map<string, ResourceRow>,
  venueId: string,
): Group[] {
  const eligible = (id: string) => {
    const r = resources.get(id);
    return r !== undefined && r.active && (r.venue_id === null || r.venue_id === venueId);
  };

  for (const [poolId, resourceId] of Object.entries(req.resourceChoices ?? {})) {
    const pool = ctx.pools.find((p) => p.id === poolId);
    if (!pool) throw new BookingError("not_found", `Pool ${poolId} not found`);
    if (pool.selection !== "customer_choice") {
      throw new BookingError("invalid_request", `Pool ${poolId} does not let the customer choose`);
    }
    if (!ctx.poolMembers.some((m) => m.pool_id === poolId && m.resource_id === resourceId)) {
      throw new BookingError("invalid_request", `Resource ${resourceId} is not in pool ${poolId}`);
    }
  }

  interface Need {
    requirement: RequirementRow;
    segment: Segment;
    candidates: string[];
  }
  const needs: Need[] = [];

  items.forEach((item, itemIndex) => {
    const isFirst = arrangement === "parallel" || itemIndex === 0;
    const isLast = arrangement === "parallel" || itemIndex === items.length - 1;
    const itemEnd = item.offsetMin + item.durationMin;

    for (const requirement of ctx.requirements.filter((r) => r.offering_id === item.offering.id)) {
      const startMin = item.offsetMin + requirement.offset_min;
      const endMin = requirement.length_min === null ? itemEnd : startMin + requirement.length_min;
      if (endMin > itemEnd || startMin >= itemEnd) {
        throw new BookingError(
          "misconfigured",
          `Requirement ${requirement.id} does not fit inside offering ${item.offering.id}`,
        );
      }

      let candidates: string[];
      if (requirement.resource_id !== null) {
        candidates = [requirement.resource_id];
      } else {
        const choice = req.resourceChoices?.[requirement.pool_id!];
        candidates = choice
          ? [choice]
          : ctx.poolMembers.filter((m) => m.pool_id === requirement.pool_id).map((m) => m.resource_id);
      }

      const segment: Segment = {
        itemIndex,
        startMin,
        endMin,
        bufferBeforeMin: isFirst && requirement.offset_min === 0 ? item.offering.buffer_before_min : 0,
        bufferAfterMin: isLast && endMin === itemEnd ? item.offering.buffer_after_min : 0,
      };
      for (let copy = 0; copy < requirement.quantity; copy++) {
        needs.push({ requirement, segment, candidates: candidates.filter(eligible) });
      }
    }
  });

  // Needs that must share a resource: same link_key within an item, and in a
  // sequential booking, the same single-resource pool across items (cut and
  // beard with the same barber).
  const parent = needs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  const firstByLink = new Map<string, number>();
  needs.forEach((need, i) => {
    if (need.requirement.link_key === null) return;
    const key = `${need.segment.itemIndex}:${need.requirement.link_key}`;
    const other = firstByLink.get(key);
    if (other === undefined) firstByLink.set(key, i);
    else union(i, other);
  });
  if (arrangement === "sequential") {
    const firstByPool = new Map<string, number>();
    needs.forEach((need, i) => {
      const poolId = need.requirement.pool_id;
      if (poolId === null || need.requirement.quantity !== 1) return;
      const other = firstByPool.get(poolId);
      if (other === undefined) firstByPool.set(poolId, i);
      else if (needs[other]!.segment.itemIndex !== need.segment.itemIndex) union(i, other);
    });
  }

  const groups = new Map<number, Group>();
  needs.forEach((need, i) => {
    const root = find(i);
    const group = groups.get(root);
    if (!group) {
      groups.set(root, {
        segments: [need.segment],
        candidates: need.candidates,
        distinctTag: need.requirement.quantity > 1 ? need.requirement.id : null,
      });
    } else {
      group.segments.push(need.segment);
      group.candidates = group.candidates.filter((c) => need.candidates.includes(c));
    }
  });

  return [...groups.values()].sort((a, b) => a.candidates.length - b.candidates.length);
}

interface AssignEnv {
  resourceOpen: (resourceId: string) => Interval[];
  resources: Map<string, ResourceRow>;
  busy: Map<string, { unit: number; range: Interval }[]>;
  load: (resourceId: string) => number;
  resourceAllowed: (resourceId: string) => boolean;
}

/** Backtracking search for one resource per group, least-booked resources first. */
function assign(groups: Group[], start: number, env: AssignEnv): Placement[] | null {
  const placements: Placement[] = [];
  const chosen: (string | null)[] = groups.map(() => null);

  const freeUnit = (resourceId: string, held: Interval): number => {
    const capacity = env.resources.get(resourceId)!.capacity;
    const existing = env.busy.get(resourceId) ?? [];
    for (let unit = 0; unit < capacity; unit++) {
      const taken =
        existing.some((a) => a.unit === unit && overlaps(a.range, held)) ||
        placements.some((p) => p.resourceId === resourceId && p.unit === unit && overlaps(p.held, held));
      if (!taken) return unit;
    }
    return -1;
  };

  const place = (groupIndex: number): boolean => {
    if (groupIndex === groups.length) return true;
    const group = groups[groupIndex]!;
    const ordered = [...group.candidates].sort((a, b) => {
      const ra = env.resources.get(a)!;
      const rb = env.resources.get(b)!;
      return env.load(a) - env.load(b) || ra.sort - rb.sort || ra.name.localeCompare(rb.name);
    });

    for (const resourceId of ordered) {
      if (
        group.distinctTag !== null &&
        groups.some((g, i) => g.distinctTag === group.distinctTag && chosen[i] === resourceId)
      ) {
        continue;
      }
      if (!env.resourceAllowed(resourceId)) continue;

      const open = env.resourceOpen(resourceId);
      const mark = placements.length;
      let fits = true;
      for (const segment of group.segments) {
        const service: Interval = [start + segment.startMin * MINUTE_MS, start + segment.endMin * MINUTE_MS];
        if (!covers(open, service)) {
          fits = false;
          break;
        }
        const held: Interval = [
          service[0] - segment.bufferBeforeMin * MINUTE_MS,
          service[1] + segment.bufferAfterMin * MINUTE_MS,
        ];
        const unit = freeUnit(resourceId, held);
        if (unit < 0) {
          fits = false;
          break;
        }
        placements.push({ groupIndex, segment, resourceId, unit, held });
      }

      if (fits) {
        chosen[groupIndex] = resourceId;
        if (place(groupIndex + 1)) return true;
        chosen[groupIndex] = null;
      }
      placements.length = mark;
    }
    return false;
  };

  return place(0) ? placements : null;
}

/** Open time for one owner on one date, or null when the owner has no schedule at all. */
function ownerOpen(
  ctx: AvailabilityContext,
  owner: "venue_id" | "resource_id" | "event_id",
  ownerId: string,
  date: LocalDate,
  tz: string,
): Interval[] | null {
  const schedules = ctx.schedules.filter((s) => s[owner] === ownerId);
  if (schedules.length === 0) return null;

  const at = (time: string) => localToInstant(date, timeToMinutes(time), tz);
  const dow = weekday(date);
  const open: Interval[] = [];

  for (const schedule of schedules.filter((s) => isValidOn(s, date))) {
    const exceptions = ctx.scheduleExceptions.filter((x) => x.schedule_id === schedule.id && x.date === date);
    if (exceptions.some((x) => x.kind === "closed" && x.start_time === null)) continue;

    const hours: Interval[] = ctx.scheduleRules
      .filter((r) => r.schedule_id === schedule.id && r.weekday === dow)
      .map((r) => [at(r.start_time), at(r.end_time)]);
    const extra: Interval[] = exceptions
      .filter((x) => x.kind === "open")
      .map((x) => [at(x.start_time!), at(x.end_time!)]);
    const removed: Interval[] = exceptions
      .filter((x) => x.kind === "closed")
      .map((x) => [at(x.start_time!), at(x.end_time!)]);

    open.push(...subtract(normalize([...hours, ...extra]), removed));
  }
  return normalize(open);
}

function isValidOn(schedule: ScheduleRow, date: LocalDate): boolean {
  return (
    (schedule.valid_from === null || schedule.valid_from <= date) &&
    (schedule.valid_to === null || date <= schedule.valid_to)
  );
}

function combine(a: Interval[] | null, b: Interval[] | null): Interval[] | null {
  if (a === null) return b;
  if (b === null) return a;
  return intersect(a, b);
}

function ruleCoversRequest(rule: CapacityRuleRow, scope: Scope): boolean {
  if (rule.event_id !== null) return rule.event_id === scope.eventId;
  if (rule.offering_id !== null) return scope.offeringIds.has(rule.offering_id);
  if (rule.venue_id !== null) return rule.venue_id === scope.venueId;
  return false;
}

function bookingInRuleScope(rule: CapacityRuleRow, c: CountedBooking): boolean {
  if (rule.event_id !== null) return c.booking.event_id === rule.event_id;
  if (rule.offering_id !== null) return c.offeringIds.has(rule.offering_id);
  if (rule.venue_id !== null) return c.booking.venue_id === rule.venue_id;
  return c.resourceIds.has(rule.resource_id!);
}

function usage(
  rule: CapacityRuleRow,
  counted: CountedBooking[],
  window: { span: Interval; date: LocalDate; week: LocalDate },
  customerId: string | undefined,
): number {
  let used = 0;
  for (const c of counted) {
    if (!bookingInRuleScope(rule, c)) continue;
    if (rule.per_customer && c.booking.customer_id !== customerId) continue;
    const inWindow =
      rule.period === "total" ||
      (rule.period === "day" && c.date === window.date) ||
      (rule.period === "week" && c.week === window.week) ||
      (rule.period === "slot" && overlaps(c.range, window.span));
    if (inWindow) used += rule.unit === "people" ? c.booking.party_size : 1;
  }
  return used;
}

function increment(rule: CapacityRuleRow, partySize: number): number {
  return rule.unit === "people" ? partySize : 1;
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}
