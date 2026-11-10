// Runs against the local database seeded by supabase/seed.sql
// (`pnpm supabase:start`, then `pnpm db:reset` to restore the seed).
import { describe, expect, it } from "vitest";

import { loadAvailabilityContext } from "../src/load";
import { resolvePolicy } from "../src/policy";
import { findSlots, type SlotRequest } from "../src/slots";
import { localClient } from "./db";
import { NOW, localStarts } from "./fixtures";

const db = localClient();

const id = (business: "a" | "b" | "c" | "d", n: number) =>
  `${business}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const melvin = {
  business: id("a", 1),
  event: id("a", 501),
  melvin: id("a", 101),
  christmasSet: id("a", 102),
  mini: id("a", 311),
  familia: id("a", 312),
  portrait: id("a", 313),
};
const barbershop = {
  business: id("b", 1),
  venue: id("b", 21),
  juan: id("b", 101),
  pedro: id("b", 102),
  luis: id("b", 103),
  barbers: id("b", 201),
  cut: id("b", 311),
  beard: id("b", 312),
};
const salon = {
  business: id("c", 1),
  venue: id("c", 21),
  ana: id("c", 101),
  wash1: id("c", 111),
  wash2: id("c", 112),
  stylists: id("c", 201),
  colour: id("c", 311),
  cut: id("c", 312),
};
const nails = {
  business: id("d", 1),
  venue: id("d", 21),
  sofia: id("d", 101),
  valeria: id("d", 102),
  manicure: id("d", 311),
  pedicure: id("d", 312),
};

async function slotsFor(businessId: string, req: Omit<SlotRequest, "now" | "to"> & { to?: string }) {
  const to = req.to ?? req.from;
  const ctx = await loadAvailabilityContext(db, { businessId, from: req.from, to });
  return findSlots(ctx, { ...req, to, now: NOW });
}

/** Every `step` minutes from `from` to `to`, both included, as local HH:MM. */
function every(step: number, from: string, to: string): string[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out: string[] = [];
  for (let m = toMin(from); m <= toMin(to); m += step) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

describe("Melvin: Christmas set event", () => {
  const mini = (from: string) =>
    slotsFor(melvin.business, { eventId: melvin.event, items: [{ offeringId: melvin.mini }], from });

  it("offers the 20-minute grid within event hours, with 12 a day left", async () => {
    const slots = await mini("2026-12-03");
    expect(localStarts(slots)).toEqual(every(20, "09:00", "16:40"));
    expect(slots.every((s) => s.remaining === 12)).toBe(true);
    expect(slots[0]!.items[0]!.allocations.map((a) => a.resourceId).sort()).toEqual(
      [melvin.melvin, melvin.christmasSet].sort(),
    );
  });

  it("skips Melvin's blocked lunch", async () => {
    const starts = localStarts(await mini("2026-12-04"));
    expect(starts).toHaveLength(21);
    expect(starts).not.toContain("12:00");
    expect(starts).toContain("11:40");
    expect(starts).toContain("13:00");
  });

  it("closes a day once it has 12 bookings", async () => {
    expect(await mini("2026-12-05")).toEqual([]);
  });

  it("counts confirmed and pending bookings but ignores an expired hold", async () => {
    const slots = await mini("2026-12-06");
    expect(localStarts(slots)).toEqual(["09:20", ...every(20, "10:20", "16:40")]);
    expect(slots.every((s) => s.remaining === 10)).toBe(true);
  });

  it("is closed on Mondays and on the blocked Sunday, and open on the extra Monday", async () => {
    expect(await mini("2026-12-07")).toEqual([]);
    expect(await mini("2026-12-13")).toEqual([]);
    expect(localStarts(await mini("2026-12-21"))).toEqual(every(20, "09:00", "12:40"));
  });

  it("fits the 40-minute family session on the same grid", async () => {
    const slots = await slotsFor(melvin.business, {
      eventId: melvin.event,
      items: [{ offeringId: melvin.familia }],
      partySize: 5,
      from: "2026-12-03",
    });
    expect(localStarts(slots)).toEqual(every(20, "09:00", "16:20"));
  });

  it("returns nothing for days outside the event", async () => {
    expect(await mini("2026-11-26")).toEqual([]);
    expect(await mini("2026-12-24")).toEqual([]);
  });
});

describe("Barbería El Corte: three barbers, customer may choose", () => {
  const cut = (choice?: string, from = "2026-12-01") =>
    slotsFor(barbershop.business, {
      venueId: barbershop.venue,
      items: [{ offeringId: barbershop.cut }],
      resourceChoices: choice ? { [barbershop.barbers]: choice } : undefined,
      from,
    });

  it("follows the chosen barber's shift and bookings", async () => {
    expect(localStarts(await cut(barbershop.pedro))).toEqual(every(15, "11:30", "18:30"));
  });

  it("gives any available barber, least booked first", async () => {
    const slots = await cut();
    expect(localStarts(slots)).toEqual(every(15, "09:00", "18:30"));
    expect(slots[0]!.items[0]!.allocations[0]!.resourceId).toBe(barbershop.luis);
  });

  it("keeps cut and beard back to back with the same barber", async () => {
    const slots = await slotsFor(barbershop.business, {
      venueId: barbershop.venue,
      items: [{ offeringId: barbershop.cut }, { offeringId: barbershop.beard }],
      resourceChoices: { [barbershop.barbers]: barbershop.juan },
      from: "2026-12-01",
    });
    expect(localStarts(slots)).toEqual(["09:00", "09:15", ...every(15, "10:30", "16:15")]);
    const [first] = slots;
    expect(first!.endsAt).toBe("2026-12-01T13:45:00.000Z");
    expect(first!.items.map((i) => [i.offeringId, i.startsAt, i.allocations[0]!.resourceId])).toEqual([
      [barbershop.cut, "2026-12-01T13:00:00.000Z", barbershop.juan],
      [barbershop.beard, "2026-12-01T13:30:00.000Z", barbershop.juan],
    ]);
  });

  it("has no slots for a barber on vacation", async () => {
    expect(await cut(barbershop.luis, "2026-12-08")).toEqual([]);
  });
});

describe("Salón Bella: colour frees the stylist while it processes", () => {
  it("lets Ana take a cut during a colour's processing time", async () => {
    const starts = localStarts(
      await slotsFor(salon.business, {
        venueId: salon.venue,
        items: [{ offeringId: salon.cut }],
        resourceChoices: { [salon.stylists]: salon.ana },
        from: "2026-12-02",
      }),
    );
    expect(starts).toEqual(["09:00", "09:15", "10:30", ...every(15, "12:00", "17:15")]);
  });

  it("splits a colour into stylist and wash station segments", async () => {
    const slots = await slotsFor(salon.business, {
      venueId: salon.venue,
      items: [{ offeringId: salon.colour }],
      resourceChoices: { [salon.stylists]: salon.ana },
      from: "2026-12-02",
    });
    const starts = localStarts(slots);
    expect(starts).not.toContain("10:30");
    expect(starts).toContain("10:45");

    const noon = slots.find((s) => s.startsAt === "2026-12-02T16:00:00.000Z")!;
    expect(noon.items[0]!.allocations).toEqual([
      { resourceId: salon.ana, unit: 0, startsAt: "2026-12-02T16:00:00.000Z", endsAt: "2026-12-02T16:30:00.000Z" },
      { resourceId: salon.wash2, unit: 0, startsAt: "2026-12-02T16:00:00.000Z", endsAt: "2026-12-02T16:15:00.000Z" },
      { resourceId: salon.ana, unit: 0, startsAt: "2026-12-02T17:15:00.000Z", endsAt: "2026-12-02T18:00:00.000Z" },
    ]);
  });
});

describe("Nails & Co: two items in parallel", () => {
  const both = (from: string) =>
    slotsFor(nails.business, {
      venueId: nails.venue,
      items: [{ offeringId: nails.manicure }, { offeringId: nails.pedicure }],
      arrangement: "parallel",
      from,
    });

  it("needs both technicians at once", async () => {
    const slots = await both("2026-12-03");
    expect(localStarts(slots)).toEqual(every(15, "11:00", "18:00"));
    const [first] = slots;
    expect(first!.endsAt).toBe("2026-12-03T16:00:00.000Z");
    const assigned = first!.items.map((i) => i.allocations[0]!.resourceId);
    expect(new Set(assigned)).toEqual(new Set([nails.sofia, nails.valeria]));
    expect(first!.items.every((i) => i.startsAt === first!.startsAt)).toBe(true);
  });

  it("works around the seeded parallel booking", async () => {
    expect(localStarts(await both("2026-12-04"))).toEqual([
      ...every(15, "10:00", "14:00"),
      ...every(15, "16:00", "18:00"),
    ]);
  });
});

describe("booking.resolve_policy matches resolvePolicy", () => {
  it.each([
    [melvin.familia, melvin.event, "Navidad familiar"],
    [melvin.mini, melvin.event, "Navidad"],
    [melvin.mini, null, "Mini sesión"],
    [melvin.portrait, null, "Estándar"],
  ])("offering %s in event %s resolves to %s", async (offeringId, eventId, expected) => {
    const { data, error } = await db
      .rpc("resolve_policy", {
        p_business_id: melvin.business,
        p_offering_id: offeringId,
        p_event_id: eventId ?? undefined,
      })
      .select("id, name")
      .single();
    expect(error).toBeNull();
    expect(data!.name).toBe(expected);

    const ctx = await loadAvailabilityContext(db, {
      businessId: melvin.business,
      from: "2026-12-01",
      to: "2026-12-01",
    });
    expect(resolvePolicy(ctx, offeringId, eventId).id).toBe(data!.id);
  });
});
