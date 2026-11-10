import { describe, expect, it } from "vitest";

import { DEFAULT_POLICY, combinePolicies, resolvePolicy } from "../src/policy";
import type { PolicyRow } from "../src/types";
import { baseContext, offering } from "./fixtures";

function policy(id: string, overrides: Partial<PolicyRow> = {}): PolicyRow {
  return { ...DEFAULT_POLICY, id, ...overrides };
}

function contextWithEvent() {
  const ctx = baseContext();
  ctx.policies = [policy("business"), policy("offering"), policy("event"), policy("event-offering")];
  ctx.business.default_policy_id = "business";
  ctx.offerings = [offering({ id: "offering", policy_id: "offering" }), offering({ id: "plain" })];
  ctx.events = [
    {
      id: "event",
      venue_id: "venue",
      status: "published",
      starts_on: "2026-12-01",
      ends_on: "2026-12-31",
      publish_at: null,
      closes_at: null,
      policy_id: "event",
      slot_mode: "grid",
      slot_interval_min: 20,
    },
  ];
  ctx.eventOfferings = [
    {
      event_id: "event",
      offering_id: "offering",
      price_minor: null,
      duration_min: null,
      policy_id: "event-offering",
      active: true,
    },
    { event_id: "event", offering_id: "plain", price_minor: null, duration_min: null, policy_id: null, active: true },
  ];
  return ctx;
}

describe("resolvePolicy", () => {
  it("prefers event-offering, then event, then offering, then business", () => {
    const ctx = contextWithEvent();
    expect(resolvePolicy(ctx, "offering", "event").id).toBe("event-offering");
    expect(resolvePolicy(ctx, "plain", "event").id).toBe("event");
    expect(resolvePolicy(ctx, "offering").id).toBe("offering");
    expect(resolvePolicy(ctx, "plain").id).toBe("business");
  });

  it("falls back to built-in defaults when the business has no policy", () => {
    const ctx = baseContext();
    ctx.business.default_policy_id = null;
    expect(resolvePolicy(ctx, "offering")).toEqual(DEFAULT_POLICY);
  });
});

describe("combinePolicies", () => {
  it("keeps the strictest value of each field", () => {
    const combined = combinePolicies([
      policy("a", {
        approval_mode: "instant",
        min_lead_minutes: 60,
        max_advance_days: null,
        pending_counts_capacity: false,
      }),
      policy("b", {
        approval_mode: "manual",
        min_lead_minutes: 30,
        max_advance_days: 14,
        pending_counts_capacity: true,
      }),
    ]);
    expect(combined).toMatchObject({
      approval_mode: "manual",
      min_lead_minutes: 60,
      max_advance_days: 14,
      pending_counts_capacity: true,
    });
  });
});
