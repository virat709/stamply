import { describe, it, expect } from "vitest";
import { PLANS, formatINR, toPaise } from "./plans";

describe("plan catalog", () => {
  it("uses the agreed INR prices for both plans and durations", () => {
    expect(PLANS.map((p) => [p.id, p.prices])).toEqual([
      ["counter", { "6m": 4999, "12m": 8999 }],
      ["multi", { "6m": 9999, "12m": 17999 }],
    ]);
  });

  it("formats INR with Indian digit grouping", () => {
    expect(formatINR(17999)).toBe("₹17,999");
  });

  it("converts INR to paise without floating point drift", () => {
    expect(toPaise(4999)).toBe(499900);
    expect(toPaise(8999)).toBe(899900);
  });
});
