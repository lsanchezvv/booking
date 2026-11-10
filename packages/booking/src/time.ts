/** A calendar date with no time zone, `YYYY-MM-DD`. */
export type LocalDate = string;

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateToUtcMs(date: LocalDate): number {
  const match = LOCAL_DATE.exec(date);
  if (!match) throw new RangeError(`Invalid local date: ${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function utcMsToDate(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return utcMsToDate(dateToUtcMs(date) + days * DAY_MS);
}

/** 0 is Sunday, matching Postgres `extract(dow)`. */
export function weekday(date: LocalDate): number {
  return new Date(dateToUtcMs(date)).getUTCDay();
}

/** The Monday on or before `date`. */
export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, -((weekday(date) + 6) % 7));
}

/** Every date from `from` to `to`, both included. */
export function eachDate(from: LocalDate, to: LocalDate): LocalDate[] {
  const dates: LocalDate[] = [];
  for (let ms = dateToUtcMs(from); ms <= dateToUtcMs(to); ms += DAY_MS) {
    dates.push(utcMsToDate(ms));
  }
  return dates;
}

/** Minutes since midnight for a Postgres `time` (`HH:MM` or `HH:MM:SS`). `24:00` is 1440. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function wallClockParts(instant: number, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

/** How far `timeZone` is ahead of UTC at `instant`, in ms. */
function zoneOffset(instant: number, timeZone: string): number {
  const p = wallClockParts(instant, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - (instant - (instant % 1000));
}

/**
 * The instant at which the clock in `timeZone` reads `minutes` past midnight
 * on `date`. A wall time repeated by a DST change resolves to its first
 * occurrence; one skipped by a DST jump moves forward by the size of the jump
 * (02:30 on a spring-forward day becomes 03:30).
 */
export function localToInstant(date: LocalDate, minutes: number, timeZone: string): number {
  const wallAsUtc = dateToUtcMs(date) + minutes * MINUTE_MS;
  const before = wallAsUtc - zoneOffset(wallAsUtc - DAY_MS / 2, timeZone);
  const after = wallAsUtc - zoneOffset(wallAsUtc + DAY_MS / 2, timeZone);
  const valid = [before, after].filter((c) => zoneOffset(c, timeZone) === wallAsUtc - c);
  return valid.length > 0 ? Math.min(...valid) : before;
}

export function instantToLocalDate(instant: number, timeZone: string): LocalDate {
  const p = wallClockParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
