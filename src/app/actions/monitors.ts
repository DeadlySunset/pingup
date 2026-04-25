"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { monitors } from "@/lib/db/schema";
import { attachAllVerifiedChannelsToMonitor } from "@/app/actions/channels";
import { getSubscription } from "@/lib/subscription";
import { computeGrace } from "@/lib/monitors/grace";

const ALLOWED_HEARTBEAT_INTERVALS_SEC = [5 * 60, 15 * 60, 30 * 60, 60 * 60, 6 * 3600, 24 * 3600];
const ALLOWED_PING_INTERVALS_SEC = [60, 5 * 60, 15 * 60, 60 * 60];
const ALLOWED_EXPECTED_STATUS = [200, 201, 204, 301, 302];

function generateToken(): string {
  // 32-char hex, URL-safe. Unguessable for anyone outside the owner.
  return crypto.randomUUID().replace(/-/g, "");
}

export async function createHeartbeatMonitor(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const rawName = formData.get("name");
  const rawInterval = formData.get("intervalSec");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const intervalSec = Number(rawInterval);

  if (!name) redirect("/monitors/new?error=name");
  if (!ALLOWED_HEARTBEAT_INTERVALS_SEC.includes(intervalSec)) {
    redirect("/monitors/new?error=interval");
  }

  const sub = await getSubscription(session.user.id);
  if (!sub.canAddMonitor) redirect("/pricing?reason=monitors");

  const [created] = await db
    .insert(monitors)
    .values({
      userId: session.user.id,
      name,
      type: "heartbeat",
      pingToken: generateToken(),
      expectedIntervalSec: intervalSec,
      graceSec: computeGrace(intervalSec),
      currentStatus: "unknown",
    })
    .returning({ id: monitors.id });

  await attachAllVerifiedChannelsToMonitor(session.user.id, created.id);

  redirect(`/monitors/${created.id}`);
}

export async function createPingMonitor(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const rawName = formData.get("name");
  const rawUrl = formData.get("url");
  const rawInterval = formData.get("intervalSec");
  const rawStatus = formData.get("expectedStatus");
  const rawTimeout = formData.get("timeoutMs");

  const name = typeof rawName === "string" ? rawName.trim() : "";
  const urlRaw = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const intervalSec = Number(rawInterval);
  const expectedStatus = Number(rawStatus ?? 200);
  const timeoutMs = Number(rawTimeout ?? 10000);

  const back = "/monitors/new?type=ping";

  if (!name) redirect(`${back}&error=name`);
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    redirect(`${back}&error=url`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    redirect(`${back}&error=url`);
  }
  if (!ALLOWED_PING_INTERVALS_SEC.includes(intervalSec)) {
    redirect(`${back}&error=interval`);
  }
  if (!ALLOWED_EXPECTED_STATUS.includes(expectedStatus)) {
    redirect(`${back}&error=status`);
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    redirect(`${back}&error=timeout`);
  }

  const sub = await getSubscription(session.user.id);
  if (!sub.canAddMonitor) redirect("/pricing?reason=monitors");
  if (intervalSec < sub.minPingIntervalSec) {
    redirect("/pricing?reason=interval");
  }

  const [created] = await db
    .insert(monitors)
    .values({
      userId: session.user.id,
      name,
      type: "ping",
      url: parsed.toString(),
      intervalSec,
      expectedStatus,
      timeoutMs,
      currentStatus: "unknown",
    })
    .returning({ id: monitors.id });

  await attachAllVerifiedChannelsToMonitor(session.user.id, created.id);

  redirect(`/monitors/${created.id}`);
}

export async function updateHeartbeatMonitor(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const rawId = formData.get("monitorId");
  const monitorId = typeof rawId === "string" ? rawId : "";
  if (!monitorId) redirect("/");

  const back = `/monitors/${monitorId}/edit`;

  const rawName = formData.get("name");
  const rawInterval = formData.get("intervalSec");
  const enabled = formData.get("enabled") === "on";
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const intervalSec = Number(rawInterval);

  if (!name) redirect(`${back}?error=name`);
  if (!ALLOWED_HEARTBEAT_INTERVALS_SEC.includes(intervalSec)) {
    redirect(`${back}?error=interval`);
  }

  const [existing] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.userId, session.user.id)))
    .limit(1);
  if (!existing || existing.type !== "heartbeat") redirect("/");

  await db
    .update(monitors)
    .set({
      name,
      enabled,
      expectedIntervalSec: intervalSec,
      graceSec: computeGrace(intervalSec),
    })
    .where(eq(monitors.id, monitorId));

  revalidatePath(`/monitors/${monitorId}`);
  revalidatePath("/");
  redirect(`/monitors/${monitorId}`);
}

export async function updatePingMonitor(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const rawId = formData.get("monitorId");
  const monitorId = typeof rawId === "string" ? rawId : "";
  if (!monitorId) redirect("/");

  const back = `/monitors/${monitorId}/edit`;

  const rawName = formData.get("name");
  const rawUrl = formData.get("url");
  const rawInterval = formData.get("intervalSec");
  const rawStatus = formData.get("expectedStatus");
  const rawTimeout = formData.get("timeoutMs");
  const enabled = formData.get("enabled") === "on";

  const name = typeof rawName === "string" ? rawName.trim() : "";
  const urlRaw = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const intervalSec = Number(rawInterval);
  const expectedStatus = Number(rawStatus ?? 200);
  const timeoutMs = Number(rawTimeout ?? 10000);

  if (!name) redirect(`${back}?error=name`);
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    redirect(`${back}?error=url`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    redirect(`${back}?error=url`);
  }
  if (!ALLOWED_PING_INTERVALS_SEC.includes(intervalSec)) {
    redirect(`${back}?error=interval`);
  }
  if (!ALLOWED_EXPECTED_STATUS.includes(expectedStatus)) {
    redirect(`${back}?error=status`);
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    redirect(`${back}?error=timeout`);
  }

  const sub = await getSubscription(session.user.id);
  if (intervalSec < sub.minPingIntervalSec) {
    redirect("/pricing?reason=interval");
  }

  const [existing] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.userId, session.user.id)))
    .limit(1);
  if (!existing || existing.type !== "ping") redirect("/");

  // URL is the identity of a ping monitor. If it changed, the previous status
  // belongs to a different endpoint — reset live state but keep check history.
  const newUrl = parsed.toString();
  const urlChanged = existing.url !== newUrl;

  await db
    .update(monitors)
    .set({
      name,
      enabled,
      url: newUrl,
      intervalSec,
      expectedStatus,
      timeoutMs,
      ...(urlChanged
        ? {
            currentStatus: "unknown" as const,
            lastStatusChangeAt: null,
            lastCheckedAt: null,
          }
        : {}),
    })
    .where(eq(monitors.id, monitorId));

  revalidatePath(`/monitors/${monitorId}`);
  revalidatePath("/");
  redirect(`/monitors/${monitorId}`);
}

export async function deleteMonitor(monitorId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await db
    .delete(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.userId, session.user.id)));

  revalidatePath("/");
  redirect("/");
}
