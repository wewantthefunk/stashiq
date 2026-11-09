import { describe, expect, it } from "vitest";

import { labelScanDisplay } from "./labelScanDisplay";

describe("labelScanDisplay", () => {
  it("shortens long production URLs", () => {
    expect(
      labelScanDisplay(
        "https://stashiq.wewantthefunk.top/bins/B12",
        "B12",
      ),
    ).toBe("Scan · stashiq.wewantthefunk.top/bins/B12");
  });

  it("keeps dev-style URLs compact", () => {
    expect(
      labelScanDisplay("http://192.168.1.11:3000/bins/B1", "B1"),
    ).toBe("Scan · 192.168.1.11:3000/bins/B1");
  });
});
