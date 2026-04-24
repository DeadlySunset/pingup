import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddr = process.env.RESEND_FROM ?? "Pingup <alerts@pingup.dev>";
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const client = apiKey ? new Resend(apiKey) : null;

export type AlertEmailInput = {
  to: string;
  monitorName: string;
  monitorId: string;
  status: "up" | "down";
  reason?: string;
};

export async function sendAlertEmail(input: AlertEmailInput): Promise<void> {
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping email alert");
    return;
  }
  const link = `${appUrl}/monitors/${input.monitorId}`;
  const subject =
    input.status === "down"
      ? `[Pingup] ${input.monitorName} is DOWN`
      : `[Pingup] ${input.monitorName} is back UP`;

  try {
    await client.emails.send({
      from: fromAddr,
      to: input.to,
      subject,
      html: alertHtml(input, link),
      text: alertText(input, link),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed:", msg);
  }
}

function alertText(input: AlertEmailInput, link: string): string {
  const reason = input.reason ? `Reason: ${input.reason}\n\n` : "";
  const verb = input.status === "down" ? "is DOWN" : "is back UP";
  return `Pingup alert: ${input.monitorName} ${verb}.\n\n${reason}Open: ${link}\n`;
}

function alertHtml(input: AlertEmailInput, link: string): string {
  const downColor = "#dc2626";
  const upColor = "#16a34a";
  const color = input.status === "down" ? downColor : upColor;
  const label = input.status === "down" ? "DOWN" : "UP";
  const reasonBlock = input.reason
    ? `<p style="margin:16px 0 0;color:#3f3f46;font-size:14px;">${escapeHtml(input.reason)}</p>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;">
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;color:#18181b;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e4e4e7;padding:24px;">
        <div style="font-size:11px;color:#71717a;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Pingup alert</div>
        <h1 style="margin:8px 0 12px;font-size:22px;line-height:1.3;">${escapeHtml(input.monitorName)}</h1>
        <span style="display:inline-block;padding:4px 10px;border-radius:9999px;background:${color};color:#fff;font-size:12px;font-weight:600;letter-spacing:0.04em;">${label}</span>
        ${reasonBlock}
        <p style="margin:24px 0 0;">
          <a href="${link}" style="display:inline-block;background:#ea580c;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">Open monitor</a>
        </p>
        <p style="margin:32px 0 0;font-size:11px;color:#a1a1aa;">
          You're receiving this because Pingup is watching this monitor for you.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
