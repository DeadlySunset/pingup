import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, gte, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { checks, monitors } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const HISTORY_DAYS = 60;
const UPTIME_WINDOW_DAYS = 30;

type DailyAgg = {
  day: string;
  upCount: number;
  downCount: number;
};

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [t, locale] = await Promise.all([getTranslations("status"), getLocale()]);

  const [monitor] = await db
    .select({
      id: monitors.id,
      name: monitors.name,
      type: monitors.type,
      currentStatus: monitors.currentStatus,
      lastStatusChangeAt: monitors.lastStatusChangeAt,
      lastCheckedAt: monitors.lastCheckedAt,
      lastPingAt: monitors.lastPingAt,
      enabled: monitors.enabled,
    })
    .from(monitors)
    .where(and(eq(monitors.publicSlug, slug), eq(monitors.enabled, true)))
    .limit(1);

  if (!monitor) notFound();

  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);

  const rawDaily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${checks.at}), 'YYYY-MM-DD')`,
      upCount: sql<string>`count(*) FILTER (WHERE ${checks.status} = 'up')`,
      downCount: sql<string>`count(*) FILTER (WHERE ${checks.status} = 'down')`,
    })
    .from(checks)
    .where(and(eq(checks.monitorId, monitor.id), gte(checks.at, since)))
    .groupBy(sql`date_trunc('day', ${checks.at})`)
    .orderBy(sql`date_trunc('day', ${checks.at})`);

  const daily: DailyAgg[] = rawDaily.map((r) => ({
    day: r.day,
    upCount: Number(r.upCount),
    downCount: Number(r.downCount),
  }));

  // Build a contiguous timeline from (today - HISTORY_DAYS + 1) to today,
  // filling gaps with zero so the bar chart has a stable width.
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days: DailyAgg[] = [];
  const todayUTC = startOfUtcDay(new Date());
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(todayUTC.getTime() - i * 86_400_000);
    const key = formatDay(d);
    days.push(byDay.get(key) ?? { day: key, upCount: 0, downCount: 0 });
  }

  // Uptime % over last UPTIME_WINDOW_DAYS days.
  const uptimeWindow = days.slice(-UPTIME_WINDOW_DAYS);
  const totalUp = uptimeWindow.reduce((s, d) => s + d.upCount, 0);
  const totalDown = uptimeWindow.reduce((s, d) => s + d.downCount, 0);
  const totalChecks = totalUp + totalDown;
  const uptimePct = totalChecks > 0 ? (totalUp / totalChecks) * 100 : null;

  const statusToken = monitor.currentStatus;
  const statusClass =
    statusToken === "up"
      ? "bg-emerald-500"
      : statusToken === "down"
        ? "bg-rose-500"
        : "bg-zinc-400";

  const statusBgClass =
    statusToken === "up"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : statusToken === "down"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  const lastCheckAt =
    monitor.type === "ping" ? monitor.lastCheckedAt : monitor.lastPingAt;
  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {t("kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{monitor.name}</h1>
      </div>

      <section
        className={`flex flex-col gap-3 rounded-lg p-6 ${statusBgClass}`}
      >
        <div className="flex items-center gap-3">
          <span className={`relative flex h-3 w-3 items-center justify-center`}>
            <span
              className={`absolute h-full w-full animate-ping rounded-full opacity-60 ${statusClass}`}
            />
            <span
              className={`relative h-2.5 w-2.5 rounded-full ${statusClass}`}
            />
          </span>
          <span className="text-2xl font-semibold">
            {t(`headline.${statusToken}`)}
          </span>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          {lastCheckAt
            ? t("lastCheck", { when: dateTimeFmt.format(lastCheckAt) })
            : t("noChecksYet")}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500">{t("uptimeLabel")}</span>
          <span className="text-2xl font-semibold tabular-nums">
            {uptimePct === null ? "—" : `${uptimePct.toFixed(2)}%`}
          </span>
          <span className="text-[11px] text-zinc-500">
            {t("uptimeWindow", { days: UPTIME_WINDOW_DAYS })}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500">{t("checksLabel")}</span>
          <span className="text-2xl font-semibold tabular-nums">{totalChecks}</span>
          <span className="text-[11px] text-zinc-500">
            {t("checksWindow", { days: UPTIME_WINDOW_DAYS })}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">
            {t("historyTitle", { days: HISTORY_DAYS })}
          </h2>
          <p className="text-xs text-zinc-500">{t("historyHint")}</p>
        </div>
        <div className="flex h-10 items-end gap-[2px]">
          {days.map((d) => {
            const total = d.upCount + d.downCount;
            const ratio = total > 0 ? d.upCount / total : null;
            const cellClass =
              ratio === null
                ? "bg-zinc-200 dark:bg-zinc-800"
                : ratio === 1
                  ? "bg-emerald-500"
                  : ratio >= 0.99
                    ? "bg-emerald-400"
                    : ratio >= 0.95
                      ? "bg-amber-400"
                      : "bg-rose-500";
            const titleParts = [
              new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                new Date(`${d.day}T00:00:00Z`),
              ),
              ratio === null
                ? t("dayNoData")
                : t("dayLine", {
                    pct: (ratio * 100).toFixed(2),
                    up: d.upCount,
                    down: d.downCount,
                  }),
            ];
            return (
              <span
                key={d.day}
                title={titleParts.join(" · ")}
                className={`h-full flex-1 rounded-sm ${cellClass}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <LegendDot color="bg-emerald-500" label={t("legend.allUp")} />
          <LegendDot color="bg-amber-400" label={t("legend.partial")} />
          <LegendDot color="bg-rose-500" label={t("legend.down")} />
          <LegendDot color="bg-zinc-300 dark:bg-zinc-700" label={t("legend.noData")} />
        </div>
      </section>

      <p className="pt-4 text-center text-xs text-zinc-500">
        {t("poweredByPrefix")}{" "}
        <Link
          href="/"
          className="font-medium text-orange-700 hover:underline dark:text-amber-400"
        >
          Pingup
        </Link>
      </p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDay(d: Date): string {
  // Match the SQL `to_char(..., 'YYYY-MM-DD')` format exactly.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
