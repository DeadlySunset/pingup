import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { monitors, users } from "@/lib/db/schema";
import { TIERS, type Tier } from "@/lib/ton/config";

export type Subscription = {
  tier: Tier;
  expiresAt: Date | null;
  monitorCount: number;
  monitorLimit: number;
  minPingIntervalSec: number;
  allowsTelegram: boolean;
  canAddMonitor: boolean;
};

export async function getSubscription(userId: string): Promise<Subscription> {
  const [[user], monitorCountRow] = await Promise.all([
    db
      .select({
        tier: users.subscriptionTier,
        expiresAt: users.subscriptionExpiresAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select({ count: count() }).from(monitors).where(eq(monitors.userId, userId)),
  ]);

  const now = new Date();
  const storedTier: Tier = user?.tier ?? "free";
  const expired = !user?.expiresAt || user.expiresAt <= now;
  const effectiveTier: Tier = storedTier === "free" || expired ? "free" : storedTier;
  const spec = TIERS[effectiveTier];

  const monitorCount = Number(monitorCountRow[0]?.count ?? 0);

  return {
    tier: effectiveTier,
    expiresAt: user?.expiresAt ?? null,
    monitorCount,
    monitorLimit: spec.maxMonitors,
    minPingIntervalSec: spec.minPingIntervalSec,
    allowsTelegram: spec.allowsTelegram,
    canAddMonitor: monitorCount < spec.maxMonitors,
  };
}
