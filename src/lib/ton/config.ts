export const PAYMENT_ADDRESS = process.env.TON_PAYMENT_ADDRESS ?? "";
export const TONCENTER_BASE_URL =
  process.env.TONCENTER_BASE_URL ?? "https://toncenter.com/api/v2";
export const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY ?? "";

export const INVOICE_TTL_MINUTES = 20;
export const MONTHLY_DAYS = 30;
export const ANNUAL_DAYS = 365;

// Allow 1% under the quoted TON amount — covers wallet fees and rate drift.
export const PAYMENT_TOLERANCE = 0.99;

export type Tier = "free" | "pro";
export type Period = "monthly" | "annual";

export type TierSpec = {
  maxMonitors: number;
  // Lowest interval (in seconds) allowed for a ping monitor.
  minPingIntervalSec: number;
  // Telegram alert channels are pro-only.
  allowsTelegram: boolean;
  monthlyUsd: number;
  annualUsd: number;
};

function readNum(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const TIERS: Record<Tier, TierSpec> = {
  free: {
    maxMonitors: readNum("FREE_MAX_MONITORS", 3),
    minPingIntervalSec: readNum("FREE_MIN_PING_INTERVAL_SEC", 300),
    allowsTelegram: false,
    monthlyUsd: 0,
    annualUsd: 0,
  },
  pro: {
    maxMonitors: readNum("PRO_MAX_MONITORS", 25),
    minPingIntervalSec: readNum("PRO_MIN_PING_INTERVAL_SEC", 60),
    allowsTelegram: true,
    monthlyUsd: readNum("PRO_PRICE_USD", 9),
    annualUsd: readNum("PRO_ANNUAL_PRICE_USD", 90),
  },
};

export function priceFor(period: Period): number {
  return period === "annual" ? TIERS.pro.annualUsd : TIERS.pro.monthlyUsd;
}

export function daysFor(period: Period): number {
  return period === "annual" ? ANNUAL_DAYS : MONTHLY_DAYS;
}
