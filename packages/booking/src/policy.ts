import type { AvailabilityContext, PolicyRow } from "./types";

/** What applies when a business has no policy at all. Mirrors the column defaults. */
export const DEFAULT_POLICY: PolicyRow = {
  id: "default",
  approval_mode: "instant",
  min_lead_minutes: 0,
  max_advance_days: null,
  pending_counts_capacity: true,
};

type PolicySource = Pick<AvailabilityContext, "business" | "offerings" | "events" | "eventOfferings" | "policies">;

/**
 * Event-offering, then event, then offering, then the business default.
 * Same order as the `booking.resolve_policy` SQL function.
 */
export function resolvePolicy(ctx: PolicySource, offeringId: string, eventId?: string | null): PolicyRow {
  const offering = ctx.offerings.find((o) => o.id === offeringId);
  const event = eventId ? ctx.events.find((e) => e.id === eventId) : undefined;
  const eventOffering = event
    ? ctx.eventOfferings.find((eo) => eo.event_id === event.id && eo.offering_id === offeringId)
    : undefined;

  const policyId =
    eventOffering?.policy_id ?? event?.policy_id ?? offering?.policy_id ?? ctx.business.default_policy_id;
  return ctx.policies.find((p) => p.id === policyId) ?? DEFAULT_POLICY;
}

/** For a booking with several items: the strictest value of each field wins. */
export function combinePolicies(policies: PolicyRow[]): PolicyRow {
  const [first, ...rest] = policies;
  if (!first) return DEFAULT_POLICY;
  return rest.reduce<PolicyRow>(
    (acc, p) => ({
      id: acc.id,
      approval_mode: acc.approval_mode === "manual" || p.approval_mode === "manual" ? "manual" : "instant",
      min_lead_minutes: Math.max(acc.min_lead_minutes, p.min_lead_minutes),
      max_advance_days:
        acc.max_advance_days === null
          ? p.max_advance_days
          : p.max_advance_days === null
            ? acc.max_advance_days
            : Math.min(acc.max_advance_days, p.max_advance_days),
      pending_counts_capacity: acc.pending_counts_capacity || p.pending_counts_capacity,
    }),
    first,
  );
}
