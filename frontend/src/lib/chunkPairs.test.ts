import { describe, expect, it } from "vitest";

import { chunkPairs } from "./chunkPairs";

describe("chunkPairs", () => {
  it("groups two labels per sheet", () => {
    expect(chunkPairs(["a", "b", "c", "d", "e"])).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });

  it("returns one sheet for a single label", () => {
    expect(chunkPairs(["only"])).toEqual([["only"]]);
  });

  it("returns empty for no labels", () => {
    expect(chunkPairs([])).toEqual([]);
  });

  it("uses even pairs for sheet count (regression: per-index page breaks)", () => {
    const n = 37;
    const labels = Array.from({ length: n }, (_, i) => `B${i}`);
    const sheets = chunkPairs(labels);
    expect(sheets).toHaveLength(Math.ceil(n / 2));
    expect(sheets.every((sheet) => sheet.length >= 1 && sheet.length <= 2)).toBe(
      true,
    );
    const total = sheets.reduce((sum, s) => sum + s.length, 0);
    expect(total).toBe(n);
  });
});
