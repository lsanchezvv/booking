/** A half-open range `[start, end)` in epoch ms. Lists are sorted and disjoint. */
export type Interval = readonly [start: number, end: number];

export function normalize(intervals: readonly Interval[]): Interval[] {
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged.at(-1);
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

export function intersect(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const [as, ae] = a[i]!;
    const [bs, be] = b[j]!;
    const s = Math.max(as, bs);
    const e = Math.min(ae, be);
    if (e > s) out.push([s, e]);
    if (ae < be) i++;
    else j++;
  }
  return out;
}

export function subtract(from: readonly Interval[], remove: readonly Interval[]): Interval[] {
  let out: Interval[] = [...from];
  for (const [rs, re] of normalize(remove)) {
    const next: Interval[] = [];
    for (const [s, e] of out) {
      if (re <= s || rs >= e) {
        next.push([s, e]);
        continue;
      }
      if (rs > s) next.push([s, rs]);
      if (re < e) next.push([re, e]);
    }
    out = next;
  }
  return out;
}

export function covers(intervals: readonly Interval[], [s, e]: Interval): boolean {
  return intervals.some(([is, ie]) => is <= s && e <= ie);
}

export function overlaps([as, ae]: Interval, [bs, be]: Interval): boolean {
  return as < be && bs < ae;
}
