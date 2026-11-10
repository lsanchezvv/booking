import { describe, expect, it } from "vitest";

import { addDays, eachDate, instantToLocalDate, localToInstant, startOfWeek, weekday } from "../src/time";

const iso = (ms: number) => new Date(ms).toISOString();

describe("local dates", () => {
  it("does calendar arithmetic without time zones", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekday("2026-11-29")).toBe(0);
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-23")).toBe("2026-11-23");
    expect(eachDate("2026-11-28", "2026-12-01")).toEqual(["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01"]);
  });
});

describe("localToInstant", () => {
  it("converts Santo Domingo wall time (UTC-4, no DST)", () => {
    expect(iso(localToInstant("2026-12-05", 9 * 60, "America/Santo_Domingo"))).toBe("2026-12-05T13:00:00.000Z");
    expect(iso(localToInstant("2026-07-05", 9 * 60, "America/Santo_Domingo"))).toBe("2026-07-05T13:00:00.000Z");
  });

  it("uses the offset in force on that date", () => {
    expect(iso(localToInstant("2026-01-15", 9 * 60, "America/New_York"))).toBe("2026-01-15T14:00:00.000Z");
    expect(iso(localToInstant("2026-07-15", 9 * 60, "America/New_York"))).toBe("2026-07-15T13:00:00.000Z");
  });

  it("moves a wall time skipped by spring-forward past the gap", () => {
    expect(iso(localToInstant("2026-03-08", 2 * 60 + 30, "America/New_York"))).toBe("2026-03-08T07:30:00.000Z");
  });

  it("picks the first occurrence of a repeated wall time", () => {
    expect(iso(localToInstant("2026-11-01", 60 + 30, "America/New_York"))).toBe("2026-11-01T05:30:00.000Z");
  });

  it("round-trips the local date", () => {
    const instant = localToInstant("2026-12-31", 23 * 60 + 59, "America/Santo_Domingo");
    expect(instantToLocalDate(instant, "America/Santo_Domingo")).toBe("2026-12-31");
    expect(instantToLocalDate(instant, "UTC")).toBe("2027-01-01");
  });
});
