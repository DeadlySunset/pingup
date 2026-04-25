"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertChannels, monitorChannels, monitors } from "@/lib/db/schema";
import { getSubscription } from "@/lib/subscription";
import { generateVerificationCode } from "@/lib/alerts/codes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function attachChannelToAllUserMonitors(
  userId: string,
  channelId: string,
): Promise<void> {
  const userMons = await db
    .select({ id: monitors.id })
    .from(monitors)
    .where(eq(monitors.userId, userId));
  if (userMons.length === 0) return;
  await db
    .insert(monitorChannels)
    .values(userMons.map((m) => ({ monitorId: m.id, alertChannelId: channelId })))
    .onConflictDoNothing();
}

export async function createEmailChannel(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const raw = formData.get("email");
  const target = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(target)) redirect("/channels?error=email");

  const [existing] = await db
    .select({ id: alertChannels.id })
    .from(alertChannels)
    .where(
      and(
        eq(alertChannels.userId, session.user.id),
        eq(alertChannels.kind, "email"),
        eq(alertChannels.target, target),
      ),
    )
    .limit(1);
  if (existing) {
    redirect("/channels");
  }

  // Auto-verify when the target matches the authenticated user's GitHub
  // email — we already trust that address from OAuth.
  const sessionEmail = session.user.email?.toLowerCase() ?? "";
  const verifiedAt = sessionEmail === target ? new Date() : null;

  const [created] = await db
    .insert(alertChannels)
    .values({
      userId: session.user.id,
      kind: "email",
      target,
      verifiedAt,
    })
    .returning({ id: alertChannels.id });

  if (verifiedAt) {
    await attachChannelToAllUserMonitors(session.user.id, created.id);
  }

  revalidatePath("/channels");
  redirect("/channels");
}

export async function createTelegramChannel() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const sub = await getSubscription(session.user.id);
  if (!sub.allowsTelegram) redirect("/pricing?reason=telegram");

  // Only one pending Telegram channel at a time — avoids a pile-up of codes.
  const [pending] = await db
    .select({ id: alertChannels.id })
    .from(alertChannels)
    .where(
      and(
        eq(alertChannels.userId, session.user.id),
        eq(alertChannels.kind, "telegram"),
      ),
    )
    .limit(1);
  if (pending) {
    redirect("/channels");
  }

  await db.insert(alertChannels).values({
    userId: session.user.id,
    kind: "telegram",
    target: "", // filled in by bot webhook once user /verify's
    verifiedAt: null,
    verificationCode: generateVerificationCode(),
  });

  revalidatePath("/channels");
  redirect("/channels");
}

export async function deleteAlertChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await db
    .delete(alertChannels)
    .where(
      and(
        eq(alertChannels.id, channelId),
        eq(alertChannels.userId, session.user.id),
      ),
    );

  revalidatePath("/channels");
}

// Called from monitor creation to auto-attach all verified channels.
export async function attachAllVerifiedChannelsToMonitor(
  userId: string,
  monitorId: string,
): Promise<void> {
  const chans = await db
    .select({ id: alertChannels.id })
    .from(alertChannels)
    .where(
      and(eq(alertChannels.userId, userId), isNotNull(alertChannels.verifiedAt)),
    );
  if (chans.length === 0) return;
  await db
    .insert(monitorChannels)
    .values(chans.map((c) => ({ monitorId, alertChannelId: c.id })))
    .onConflictDoNothing();
}
