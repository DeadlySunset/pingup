import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checks, monitors } from "@/lib/db/schema";
import { dispatchStatusChange } from "@/lib/alerts/dispatch";

export const dynamic = "force-dynamic";

async function handlePing(token: string) {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.pingToken, token))
    .limit(1);

  // 404 with a generic body — don't leak whether the token is wrong vs. the
  // monitor was deleted. Still 200-safe to call: legitimate heartbeats never
  // see this branch because they know the right token.
  if (!monitor || monitor.type !== "heartbeat") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Disabled monitors accept pings but don't record them. 200 so the user's
  // cron retry logic doesn't back off.
  if (!monitor.enabled) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const now = new Date();
  const wasDown = monitor.currentStatus === "down";
  const statusChanged = monitor.currentStatus !== "up";

  await db.insert(checks).values({
    monitorId: monitor.id,
    at: now,
    status: "up",
  });

  await db
    .update(monitors)
    .set({
      lastPingAt: now,
      currentStatus: "up",
      lastStatusChangeAt: statusChanged ? now : monitor.lastStatusChangeAt,
    })
    .where(eq(monitors.id, monitor.id));

  // Recovery alert — only fire when we were actually "down". First-ever ping
  // flips unknown→up and isn't worth an email.
  if (wasDown) {
    await dispatchStatusChange({ ...monitor, currentStatus: "up" }, "up");
  }

  return NextResponse.json({ ok: true, recorded: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return handlePing(token);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return handlePing(token);
}
