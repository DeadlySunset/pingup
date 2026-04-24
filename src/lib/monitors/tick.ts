import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checks, monitors } from "@/lib/db/schema";
import { dispatchStatusChange } from "@/lib/alerts/dispatch";

type Monitor = typeof monitors.$inferSelect;

export type TickResult = {
  ranAt: string;
  active: number;
  heartbeats: { checked: number; flaggedDown: number };
  pings: { checked: number; up: number; down: number };
};

export async function runTick(): Promise<TickResult> {
  const now = new Date();
  const active = await db.select().from(monitors).where(eq(monitors.enabled, true));

  const result: TickResult = {
    ranAt: now.toISOString(),
    active: active.length,
    heartbeats: { checked: 0, flaggedDown: 0 },
    pings: { checked: 0, up: 0, down: 0 },
  };

  // Ping checks are parallelizable; heartbeat detection is DB-only so we
  // run them inline.
  const pingTasks: Promise<void>[] = [];

  for (const m of active) {
    if (m.type === "heartbeat") {
      await handleHeartbeat(m, now, result);
    } else if (m.type === "ping") {
      pingTasks.push(handlePing(m, now, result));
    }
  }

  await Promise.all(pingTasks);
  return result;
}

async function handleHeartbeat(m: Monitor, now: Date, result: TickResult): Promise<void> {
  if (!m.expectedIntervalSec || !m.graceSec) return;
  result.heartbeats.checked++;

  // Never-pinged monitors stay in "unknown" until their first ping. This
  // avoids flooding the user with "down" alerts right after monitor creation
  // before they've wired up their cron.
  if (!m.lastPingAt) return;

  const dueBy = new Date(
    m.lastPingAt.getTime() + (m.expectedIntervalSec + m.graceSec) * 1000,
  );
  const isOverdue = now > dueBy;
  if (!isOverdue) return;

  if (m.currentStatus === "down") return; // already flagged

  const reason = "Missed expected heartbeat";
  await db.insert(checks).values({
    monitorId: m.id,
    at: now,
    status: "down",
    error: reason,
  });
  await db
    .update(monitors)
    .set({ currentStatus: "down", lastStatusChangeAt: now })
    .where(eq(monitors.id, m.id));
  result.heartbeats.flaggedDown++;
  await dispatchStatusChange(m, "down", reason);
}

async function handlePing(m: Monitor, now: Date, result: TickResult): Promise<void> {
  if (!m.url || !m.intervalSec) return;

  const due =
    !m.lastCheckedAt ||
    now.getTime() - m.lastCheckedAt.getTime() >= m.intervalSec * 1000;
  if (!due) return;

  result.pings.checked++;
  const check = await performPingCheck(m);

  await db.insert(checks).values({
    monitorId: m.id,
    at: now,
    status: check.status,
    responseMs: check.responseMs,
    statusCode: check.statusCode ?? null,
    error: check.error ?? null,
  });

  const statusChanged = m.currentStatus !== check.status;
  await db
    .update(monitors)
    .set({
      lastCheckedAt: now,
      currentStatus: check.status,
      lastStatusChangeAt: statusChanged ? now : m.lastStatusChangeAt,
    })
    .where(eq(monitors.id, m.id));

  if (check.status === "up") result.pings.up++;
  else result.pings.down++;

  // Only alert on a transition (up→down or down→up). Repeated-down doesn't
  // re-alert; "unknown"→"up" on the very first check is not actionable so
  // we skip that too.
  const fromKnownToChange =
    statusChanged && (m.currentStatus === "up" || m.currentStatus === "down");
  const firstEverDown = m.currentStatus === "unknown" && check.status === "down";
  if (fromKnownToChange || firstEverDown) {
    await dispatchStatusChange(m, check.status, check.error);
  }
}

type PingOutcome = {
  status: "up" | "down";
  responseMs: number;
  statusCode?: number;
  error?: string;
};

async function performPingCheck(m: Monitor): Promise<PingOutcome> {
  const url = m.url!;
  const expectedStatus = m.expectedStatus ?? 200;
  const timeoutMs = m.timeoutMs ?? 10_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "Pingup/1.0" },
    });
    const responseMs = Date.now() - t0;
    const ok = res.status === expectedStatus;
    return {
      status: ok ? "up" : "down",
      responseMs,
      statusCode: res.status,
      error: ok ? undefined : `unexpected status ${res.status}`,
    };
  } catch (err) {
    const responseMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    const short = msg.length > 200 ? msg.slice(0, 200) : msg;
    return { status: "down", responseMs, error: short };
  } finally {
    clearTimeout(timer);
  }
}
