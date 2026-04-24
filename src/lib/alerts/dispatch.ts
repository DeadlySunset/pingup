import { eq, isNotNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { alertChannels, monitorChannels, monitors } from "@/lib/db/schema";
import { sendAlertEmail } from "@/lib/email";

type Monitor = typeof monitors.$inferSelect;

export async function dispatchStatusChange(
  monitor: Monitor,
  newStatus: "up" | "down",
  reason?: string,
): Promise<void> {
  // Pull all verified channels attached to this monitor. Pending Telegram
  // channels have verifiedAt=null and are skipped until bot verification lands.
  const rows = await db
    .select({
      kind: alertChannels.kind,
      target: alertChannels.target,
    })
    .from(monitorChannels)
    .innerJoin(alertChannels, eq(alertChannels.id, monitorChannels.alertChannelId))
    .where(
      and(
        eq(monitorChannels.monitorId, monitor.id),
        isNotNull(alertChannels.verifiedAt),
      ),
    );

  if (rows.length === 0) return;

  await Promise.allSettled(
    rows.map(async (r) => {
      if (r.kind === "email") {
        await sendAlertEmail({
          to: r.target,
          monitorName: monitor.name,
          monitorId: monitor.id,
          status: newStatus,
          reason,
        });
      }
      // telegram: stub — real sender lands with the bot webhook iteration.
    }),
  );
}
