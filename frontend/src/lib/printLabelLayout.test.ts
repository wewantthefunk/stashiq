import { describe, expect, it } from "vitest";

import { chunkPairs } from "./chunkPairs";

/** Slot classes used with absolute top/bottom halves on each sheet. */
export function labelSlotPosition(slotIndex: number): "top" | "bottom" {
  return slotIndex === 0 ? "top" : "bottom";
}

describe("print label sheet layout", () => {
  it("maps first label on each sheet to top half, second to bottom", () => {
    const sheets = chunkPairs(["A", "B", "C", "D", "E"]);
    expect(sheets).toHaveLength(3);
    expect(labelSlotPosition(0)).toBe("top");
    expect(labelSlotPosition(1)).toBe("bottom");
    expect(sheets[2]).toEqual(["E"]);
  });

  it("page three in a 2-up job starts at sheet index 2 (5th physical label)", () => {
    const labels = Array.from({ length: 6 }, (_, i) => `B${i}`);
    const sheets = chunkPairs(labels);
    expect(sheets[2]).toEqual(["B4", "B5"]);
  });
});
