import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertChannels } from "@/lib/db/schema";
import {
  createEmailChannel,
  createTelegramChannel,
  deleteAlertChannel,
} from "@/app/actions/channels";
import { SubmitButton } from "@/components/submit-button";
import { DangerButton } from "@/components/danger-button";
import { CopyButton } from "@/components/copy-button";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const sp = await searchParams;

  const channels = await db
    .select()
    .from(alertChannels)
    .where(eq(alertChannels.userId, session.user.id))
    .orderBy(desc(alertChannels.createdAt));

  const emails = channels.filter((c) => c.kind === "email");
  const telegrams = channels.filter((c) => c.kind === "telegram");
  const pendingTelegram = telegrams.find((c) => !c.verifiedAt);

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "pingup_bot";
  const deeplink = pendingTelegram
    ? `https://t.me/${botUsername}?start=${pendingTelegram.verificationCode}`
    : null;

  const errorMessage =
    sp.error === "email" ? t("channels.errors.email") : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {t("common.back")}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("channels.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("channels.subtitle")}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Email section */}
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium">{t("channels.email.title")}</h2>
          <p className="text-xs text-zinc-500">{t("channels.email.body")}</p>
        </div>

        {emails.length > 0 && (
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {emails.map((c) => {
              async function remove() {
                "use server";
                await deleteAlertChannel(c.id);
              }
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 bg-zinc-50 p-3 text-sm dark:bg-zinc-950/50"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium">{c.target}</span>
                    <span className="text-[11px] text-zinc-500">
                      {c.verifiedAt
                        ? t("channels.verifiedOn", {
                            date: dateFmt.format(c.verifiedAt),
                          })
                        : t("channels.pending")}
                    </span>
                  </div>
                  <DangerButton
                    action={remove}
                    confirm={t("channels.deleteConfirm").replace("{target}", c.target)}
                    pendingLabel={t("channels.removing")}
                    className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    {t("channels.remove")}
                  </DangerButton>
                </li>
              );
            })}
          </ul>
        )}

        <form action={createEmailChannel} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("channels.email.addLabel")}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="email"
                name="email"
                required
                defaultValue={session.user.email ?? ""}
                placeholder="you@example.com"
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <SubmitButton
                pendingLabel={t("channels.adding")}
                className="shrink-0 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] disabled:opacity-60 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
              >
                {t("channels.add")}
              </SubmitButton>
            </div>
          </label>
          <span className="text-xs text-zinc-500">{t("channels.email.addHint")}</span>
        </form>
      </section>

      {/* Telegram section */}
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium">{t("channels.telegram.title")}</h2>
          <p className="text-xs text-zinc-500">{t("channels.telegram.body")}</p>
        </div>

        {telegrams.length > 0 && (
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {telegrams.map((c) => {
              async function remove() {
                "use server";
                await deleteAlertChannel(c.id);
              }
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 bg-zinc-50 p-3 text-sm dark:bg-zinc-950/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {c.verifiedAt
                          ? t("channels.telegram.connectedAs", {
                              target: c.target || "—",
                            })
                          : t("channels.telegram.pending")}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {c.verifiedAt
                          ? t("channels.verifiedOn", {
                              date: dateFmt.format(c.verifiedAt),
                            })
                          : t("channels.telegram.pendingHint")}
                      </span>
                    </div>
                    <DangerButton
                      action={remove}
                      confirm={t("channels.deleteConfirmTelegram")}
                      pendingLabel={t("channels.removing")}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      {t("channels.remove")}
                    </DangerButton>
                  </div>
                  {!c.verifiedAt && c.verificationCode && (
                    <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
                          {t("channels.telegram.verifyTitle")}
                        </span>
                        <span className="text-xs text-amber-900 dark:text-amber-200">
                          {t("channels.telegram.verifyBody", {
                            bot: `@${botUsername}`,
                            code: c.verificationCode,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded border border-amber-200 bg-white p-2 dark:border-amber-900/50 dark:bg-zinc-900">
                        <code className="flex-1 font-mono text-xs">
                          /verify {c.verificationCode}
                        </code>
                        <CopyButton text={`/verify ${c.verificationCode}`} />
                      </div>
                      {deeplink && (
                        <a
                          href={deeplink}
                          target="_blank"
                          rel="noreferrer"
                          className="self-start rounded-md bg-[#229ED9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1b8ac1]"
                        >
                          {t("channels.telegram.openBot")}
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!pendingTelegram && (
          <form action={createTelegramChannel}>
            <SubmitButton
              pendingLabel={t("channels.adding")}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] disabled:opacity-60 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
            >
              {t("channels.telegram.add")}
            </SubmitButton>
          </form>
        )}
      </section>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
        {t("channels.autoAttachNote")}
      </div>
    </div>
  );
}
