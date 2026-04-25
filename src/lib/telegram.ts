const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const API_BASE = "https://api.telegram.org";

type SendMessageInput = {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  disablePreview?: boolean;
};

export async function sendTelegramMessage(input: SendMessageInput): Promise<void> {
  if (!botToken) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set — skipping message");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        parse_mode: input.parseMode ?? "HTML",
        disable_web_page_preview: input.disablePreview ?? true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] sendMessage ${res.status}:`, body);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[telegram] send failed:", msg);
  }
}

export type AlertTelegramInput = {
  chatId: string;
  monitorName: string;
  monitorId: string;
  status: "up" | "down";
  reason?: string;
};

export async function sendAlertTelegram(input: AlertTelegramInput): Promise<void> {
  const link = `${appUrl}/monitors/${input.monitorId}`;
  const emoji = input.status === "down" ? "🔴" : "🟢";
  const label = input.status === "down" ? "is DOWN" : "is back UP";
  const reason = input.reason ? `\n<i>${escapeHtml(input.reason)}</i>` : "";
  const text =
    `${emoji} <b>${escapeHtml(input.monitorName)}</b> ${label}${reason}\n\n` +
    `<a href="${link}">Open monitor</a>`;
  await sendTelegramMessage({ chatId: input.chatId, text });
}

// Matches `/verify CODE` or `/start CODE` (Telegram deeplink), with optional
// `@botname` suffix after the command. Code is 6 chars from the verification
// alphabet.
export const VERIFY_COMMAND_RE = /^\/(?:verify|start)(?:@\w+)?\s+([A-Z2-9]{6})\b/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
