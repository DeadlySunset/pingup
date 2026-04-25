import { describe, expect, it } from "vitest";
import { TIERS, priceFor, daysFor, MONTHLY_DAYS, ANNUAL_DAYS } from "@/lib/ton/config";

describe("TIERS", () => {
  it("free is restrictive: 3 monitors, 5-min minimum, no telegram", () => {
    expect(TIERS.free.maxMonitors).toBe(3);
    expect(TIERS.free.minPingIntervalSec).toBe(300);
    expect(TIERS.free.allowsTelegram).toBe(false);
    expect(TIERS.free.monthlyUsd).toBe(0);
  });

  it("pro unlocks faster intervals and more monitors", () => {
    expect(TIERS.pro.maxMonitors).toBeGreaterThan(TIERS.free.maxMonitors);
    expect(TIERS.pro.minPingIntervalSec).toBeLessThan(TIERS.free.minPingIntervalSec);
    expect(TIERS.pro.allowsTelegram).toBe(true);
  });

  it("annual price is cheaper than 12 months at the monthly rate", () => {
    expect(TIERS.pro.annualUsd).toBeLessThan(TIERS.pro.monthlyUsd * 12);
  });
});

describe("priceFor / daysFor", () => {
  it("monthly returns the monthly USD figure", () => {
    expect(priceFor("monthly")).toBe(TIERS.pro.monthlyUsd);
  });

  it("annual returns the annual USD figure", () => {
    expect(priceFor("annual")).toBe(TIERS.pro.annualUsd);
  });

  it("daysFor matches the documented windows", () => {
    expect(daysFor("monthly")).toBe(MONTHLY_DAYS);
    expect(daysFor("annual")).toBe(ANNUAL_DAYS);
    expect(MONTHLY_DAYS).toBe(30);
    expect(ANNUAL_DAYS).toBe(365);
  });
});
