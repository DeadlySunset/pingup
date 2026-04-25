import { describe, expect, it } from "vitest";
import { usdToTon } from "@/lib/ton/price";

describe("usdToTon", () => {
  it("rounds up to 2 decimals so the user sends a clean number", () => {
    // 9 USD at $3.20/TON = 2.8125 → rounds up to 2.82
    expect(usdToTon(9, 3.2)).toBe(2.82);
  });

  it("doesn't round when already at 2 decimals", () => {
    // 10 USD at $5/TON = exactly 2.00
    expect(usdToTon(10, 5)).toBe(2);
  });

  it("rounds tiny amounts up — never down to zero", () => {
    expect(usdToTon(0.01, 5)).toBe(0.01);
  });

  it("rounds annual quotes the same way", () => {
    // 90 USD at $2.85/TON = 31.578... → 31.58
    expect(usdToTon(90, 2.85)).toBe(31.58);
  });
});
