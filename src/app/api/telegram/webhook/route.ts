import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { alertChannels, monitorChannels, monitors } from "@/lib/db/schema";
import { sendTelegramMessage, VERIFY_COMMAND_RE } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
};

// Always respond 200 to Telegram — non-200 causes Telegram to retry, which
// would pile up duplicate verifications. We only 401 when the shared secret
// doesn't match (clearly not Telegram).
export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const text = update.message?.text?.trim();
  const chatId = update.message?.chat?.id;
  if (!text || chatId == null) {
    return NextResponse.json({ ok: true });
  }

  const match = text.match(VERIFY_COMMAND_RE);
  if (!match) {
    if (text.startsWith("/start")) {
      await sendTelegramMessage({
        chatId: String(chatId),
        text:
          "👋 Welcome to <b>Pingup</b>.\n\n" +
          "To connect this chat as an alert channel, go to <b>Channels</b> in the app, add a Telegram channel, and tap the bot link — or send <code>/verify CODE</code> here.",
      });
    }
    return NextResponse.json({ ok: true });
  }

  const code = match[1].toUpperCase();
  const target = String(chatId);

  const [pending] = await db
    .select({ id: alertChannels.id, userId: alertChannels.userId })
    .from(alertChannels)
    .where(
      and(
        eq(alertChannels.kind, "telegram"),
        eq(alertChannels.verificationCode, code),
        isNull(alertChannels.verifiedAt),
      ),
    )
    .limit(1);

  if (!pending) {
    await sendTelegramMessage({
      chatId: target,
      text:
        "❌ That code is invalid or already used.\n\n" +
        "Open <b>Channels</b> in Pingup and generate a new one.",
    });
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  await db
    .update(alertChannels)
    .set({ target, verifiedAt: now, verificationCode: null })
    .where(eq(alertChannels.id, pending.id));

  // Auto-attach to every monitor the user owns.
  const userMons = await db
    .select({ id: monitors.id })
    .from(monitors)
    .where(eq(monitors.userId, pending.userId));
  if (userMons.length > 0) {
    await db
      .insert(monitorChannels)
      .values(userMons.map((m) => ({ monitorId: m.id, alertChannelId: pending.id })))
      .onConflictDoNothing();
  }

  await sendTelegramMessage({
    chatId: target,
    text:
      "✅ Telegram channel connected.\n\n" +
      `Alerts for <b>${userMons.length}</b> monitor(s) will arrive here.`,
  });

  return NextResponse.json({ ok: true });
}

// Telegram only POSTs, but a GET is handy for a quick liveness probe.
export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
