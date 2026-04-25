import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checks, monitors } from "@/lib/db/schema";
import { deleteMonitor } from "@/app/actions/monitors";
import { CopyButton } from "@/components/copy-button";
import { DangerButton } from "@/components/danger-button";
import { UptimeBar } from "@/components/uptime-bar";

function formatInterval(sec: number | null, t: (k: string) => string): string {
  if (!sec) return "—";
  if (sec < 3600) return t("common.durationMin").replace("{n}", String(Math.round(sec / 60)));
  if (sec < 86400) return t("common.durationHour").replace("{n}", String(Math.round(sec / 3600)));
  return t("common.durationDay").replace("{n}", String(Math.round(sec / 86400)));
}

export default async function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  const [monitor] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)))
    .limit(1);
  if (!monitor) notFound();

  const history = await db
    .select()
    .from(checks)
    .where(eq(checks.monitorId, id))
    .orderBy(desc(checks.at))
    .limit(15);

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const pingUrl = monitor.type === "heartbeat" && monitor.pingToken
    ? `${appUrl}/p/${monitor.pingToken}`
    : null;
  const isPingMonitor = monitor.type === "ping";
  const publicStatusUrl = monitor.publicSlug ? `${appUrl}/status/${monitor.publicSlug}` : null;

  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const statusClass =
    monitor.currentStatus === "up"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : monitor.currentStatus === "down"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  async function deleteThis() {
    "use server";
    await deleteMonitor(id);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {t("common.back")}
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{monitor.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusClass}`}
            >
              {t(`monitors.status.${monitor.currentStatus}`)}
            </span>
            {!monitor.enabled && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {t("monitors.detail.disabled")}
              </span>
            )}
          </div>
          <Link
            href={`/monitors/${id}/edit`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t("monitors.detail.edit")}
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          {t("monitors.detail.typeLabel")} ·{" "}
          {t(`monitors.types.${monitor.type}`)}
        </p>
      </div>

      {pingUrl && (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">{t("monitors.detail.urlTitle")}</h2>
            <p className="text-xs text-zinc-500">{t("monitors.detail.urlHint")}</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {pingUrl}
            </code>
            <CopyButton text={pingUrl} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.detail.exampleCurlTitle")}
            </p>
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-950 p-2 text-emerald-300 dark:border-zinc-800">
              <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs">
                curl -fsS -m 10 {pingUrl}
              </code>
              <CopyButton
                text={`curl -fsS -m 10 ${pingUrl}`}
                className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              />
            </div>
            <p className="text-xs text-zinc-500">{t("monitors.detail.exampleCurlHint")}</p>
          </div>
        </section>
      )}

      {isPingMonitor && monitor.url && (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">{t("monitors.detail.targetUrlTitle")}</h2>
            <p className="text-xs text-zinc-500">{t("monitors.detail.targetUrlHint")}</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {monitor.url}
            </code>
            <a
              href={monitor.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ↗
            </a>
          </div>
        </section>
      )}

      {publicStatusUrl && (
        <section className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">
              {t("monitors.detail.publicStatusTitle")}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("monitors.detail.publicStatusHint")}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white p-2 dark:border-emerald-900/50 dark:bg-zinc-950">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {publicStatusUrl}
            </code>
            <a
              href={publicStatusUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ↗
            </a>
            <CopyButton text={publicStatusUrl} />
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isPingMonitor ? (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">{t("monitors.detail.interval")}</span>
              <span className="font-medium">
                {formatInterval(monitor.intervalSec, t)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">
                {t("monitors.detail.expectedStatus")}
              </span>
              <span className="font-medium">{monitor.expectedStatus ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">{t("monitors.detail.timeout")}</span>
              <span className="font-medium">
                {monitor.timeoutMs ? `${Math.round(monitor.timeoutMs / 1000)}s` : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">
                {t("monitors.detail.lastChecked")}
              </span>
              <span className="font-medium">
                {monitor.lastCheckedAt
                  ? dateTimeFmt.format(monitor.lastCheckedAt)
                  : t("monitors.detail.lastCheckedNever")}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">{t("monitors.detail.interval")}</span>
              <span className="font-medium">
                {formatInterval(monitor.expectedIntervalSec, t)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">{t("monitors.detail.grace")}</span>
              <span className="font-medium">
                {formatInterval(monitor.graceSec, t)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">{t("monitors.detail.lastPing")}</span>
              <span className="font-medium">
                {monitor.lastPingAt
                  ? dateTimeFmt.format(monitor.lastPingAt)
                  : t("monitors.detail.lastPingNever")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-zinc-500">{t("monitors.detail.created")}</span>
              <span className="font-medium">{dateTimeFmt.format(monitor.createdAt)}</span>
            </div>
          </>
        )}
      </section>

      <UptimeBar monitorId={monitor.id} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("monitors.detail.recentChecks")}
        </h2>
        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-700">
            {t("monitors.detail.noChecks")}
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {history.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={
                      "h-2 w-2 shrink-0 rounded-full " +
                      (c.status === "up" ? "bg-emerald-500" : "bg-rose-500")
                    }
                  />
                  <span className="font-medium">
                    {t(`monitors.status.${c.status}`)}
                  </span>
                  {c.statusCode !== null && c.statusCode !== undefined && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {c.statusCode}
                    </span>
                  )}
                  {c.responseMs !== null && c.responseMs !== undefined && (
                    <span className="font-mono text-xs text-zinc-500">
                      {c.responseMs}ms
                    </span>
                  )}
                  {c.error && (
                    <span className="truncate text-xs text-zinc-500">— {c.error}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  {dateTimeFmt.format(c.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/40 p-5 dark:border-red-900/50 dark:bg-red-950/10">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">{t("monitors.detail.dangerZone")}</h2>
          <p className="text-xs text-zinc-500">{t("monitors.detail.deleteHint")}</p>
        </div>
        <DangerButton
          action={deleteThis}
          confirm={t("monitors.detail.deleteConfirm").replace("{name}", monitor.name)}
          pendingLabel={t("monitors.detail.deleting")}
        >
          {t("monitors.detail.delete")}
        </DangerButton>
      </section>
    </div>
  );
}
