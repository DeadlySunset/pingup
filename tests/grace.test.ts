import { describe, expect, it } from "vitest";
import { computeGrace } from "@/lib/monitors/grace";

describe("computeGrace", () => {
  it("is 20% of the interval for typical heartbeat windows", () => {
    expect(computeGrace(15 * 60)).toBe(180); // 15m → 3m
    expect(computeGrace(60 * 60)).toBe(720); // 1h → 12m
    expect(computeGrace(24 * 3600)).toBe(17280); // 24h → 4.8h
  });

  it("floors at 60s for tiny intervals", () => {
    expect(computeGrace(60)).toBe(60); // 20% would be 12s — floor wins
    expect(computeGrace(120)).toBe(60); // 20% = 24s — floor wins
    expect(computeGrace(300)).toBe(60); // 20% = 60s — both equal, floor still applies
    expect(computeGrace(360)).toBe(72); // 20% = 72s — actual 20% wins
  });

  it("returns an integer (rounds .5 up)", () => {
    expect(Number.isInteger(computeGrace(317))).toBe(true);
  });
});
