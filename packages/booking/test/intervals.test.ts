import { describe, expect, it } from "vitest";

import { covers, intersect, normalize, subtract } from "../src/intervals";

describe("intervals", () => {
  it("merges overlapping and touching ranges", () => {
    expect(
      normalize([
        [5, 8],
        [1, 3],
        [3, 4],
        [7, 10],
      ]),
    ).toEqual([
      [1, 4],
      [5, 10],
    ]);
  });

  it("intersects two lists", () => {
    expect(
      intersect(
        [
          [0, 10],
          [20, 30],
        ],
        [[5, 25]],
      ),
    ).toEqual([
      [5, 10],
      [20, 25],
    ]);
  });

  it("subtracts holes", () => {
    expect(
      subtract(
        [[0, 10]],
        [
          [2, 3],
          [8, 12],
        ],
      ),
    ).toEqual([
      [0, 2],
      [3, 8],
    ]);
  });

  it("checks that one range covers another", () => {
    expect(covers([[0, 10]], [0, 10])).toBe(true);
    expect(
      covers(
        [
          [0, 5],
          [5, 10],
        ],
        [4, 6],
      ),
    ).toBe(false);
  });
});
