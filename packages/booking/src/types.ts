import type { Enums, Tables } from "./database.types";

export type BookingStatus = Enums<"booking_status">;

export type BusinessRow = Pick<Tables<"business">, "id" | "timezone" | "slot_interval_min" | "default_policy_id">;
export type VenueRow = Pick<Tables<"venue">, "id" | "timezone" | "active">;
export type ResourceRow = Pick<Tables<"resource">, "id" | "venue_id" | "name" | "capacity" | "active" | "sort">;
export type PoolRow = Pick<Tables<"resource_pool">, "id" | "selection">;
export type PoolMemberRow = Pick<Tables<"resource_pool_member">, "pool_id" | "resource_id">;
export type OfferingRow = Pick<
  Tables<"offering">,
  | "id"
  | "duration_min"
  | "buffer_before_min"
  | "buffer_after_min"
  | "slot_interval_min"
  | "price_minor"
  | "currency"
  | "min_party"
  | "max_party"
  | "policy_id"
  | "active"
>;
export type RequirementRow = Pick<
  Tables<"offering_requirement">,
  "id" | "offering_id" | "pool_id" | "resource_id" | "quantity" | "offset_min" | "length_min" | "link_key"
>;
export type EventRow = Pick<
  Tables<"event">,
  | "id"
  | "venue_id"
  | "status"
  | "starts_on"
  | "ends_on"
  | "publish_at"
  | "closes_at"
  | "policy_id"
  | "slot_mode"
  | "slot_interval_min"
>;
export type EventOfferingRow = Pick<
  Tables<"event_offering">,
  "event_id" | "offering_id" | "price_minor" | "duration_min" | "policy_id" | "active"
>;
export type PolicyRow = Pick<
  Tables<"booking_policy">,
  "id" | "approval_mode" | "min_lead_minutes" | "max_advance_days" | "pending_counts_capacity"
>;
export type ScheduleRow = Pick<
  Tables<"schedule">,
  "id" | "venue_id" | "resource_id" | "event_id" | "valid_from" | "valid_to"
>;
export type ScheduleRuleRow = Pick<Tables<"schedule_rule">, "schedule_id" | "weekday" | "start_time" | "end_time">;
export type ScheduleExceptionRow = Pick<
  Tables<"schedule_exception">,
  "schedule_id" | "date" | "kind" | "start_time" | "end_time"
>;
export type TimeOffRow = Pick<Tables<"time_off">, "venue_id" | "resource_id" | "event_id" | "starts_at" | "ends_at">;
export type CapacityRuleRow = Pick<
  Tables<"capacity_rule">,
  "id" | "event_id" | "offering_id" | "resource_id" | "venue_id" | "period" | "unit" | "max_count" | "per_customer"
>;
export type ExistingBooking = Pick<
  Tables<"booking">,
  "id" | "customer_id" | "event_id" | "venue_id" | "status" | "starts_at" | "ends_at" | "party_size" | "hold_expires_at"
> & {
  items: Pick<Tables<"booking_item">, "offering_id">[];
  allocations: Pick<Tables<"booking_allocation">, "resource_id" | "unit" | "starts_at" | "ends_at" | "active">[];
};

/**
 * Everything the slot finder needs about one business. Bookings must cover
 * every active booking that can touch the requested dates, plus all bookings
 * counted by `total` capacity rules.
 */
export interface AvailabilityContext {
  business: BusinessRow;
  venues: VenueRow[];
  resources: ResourceRow[];
  pools: PoolRow[];
  poolMembers: PoolMemberRow[];
  offerings: OfferingRow[];
  requirements: RequirementRow[];
  events: EventRow[];
  eventOfferings: EventOfferingRow[];
  policies: PolicyRow[];
  schedules: ScheduleRow[];
  scheduleRules: ScheduleRuleRow[];
  scheduleExceptions: ScheduleExceptionRow[];
  timeOff: TimeOffRow[];
  capacityRules: CapacityRuleRow[];
  bookings: ExistingBooking[];
}
