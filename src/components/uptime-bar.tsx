import { and, eq, gte, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { checks } from "@/lib/db/schema";

type DailyAgg = {
  day: string;
  upCount: number;
  downCount: number;
};

export async function UptimeBar({
  monitorId,
  monitorType,
  historyDays = 60,
  uptimeWindowDays = 30,
}: {
  monitorId: string;
  monitorType?: "heartbeat" | "ping";
  historyDays?: number;
  uptimeWindowDays?: number;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("status"),
    getLocale(),
  ]);
  const since = new Date(Date.now() - historyDays * 86_400_000);

  const rawDaily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${checks.at}), 'YYYY-MM-DD')`,
      upCount: sql<string>`count(*) FILTER (WHERE ${checks.status} = 'up')`,
      downCount: sql<string>`count(*) FILTER (WHERE ${checks.status} = 'down')`,
    })
    .from(checks)
    .where(and(eq(checks.monitorId, monitorId), gte(checks.at, since)))
    .groupBy(sql`date_trunc('day', ${checks.at})`)
    .orderBy(sql`date_trunc('day', ${checks.at})`);

  const daily: DailyAgg[] = rawDaily.map((r) => ({
    day: r.day,
    upCount: Number(r.upCount),
    downCount: Number(r.downCount),
  }));

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days: DailyAgg[] = [];
  const todayUTC = startOfUtcDay(new Date());
  for (let i = historyDays - 1; i >= 0; i--) {
    const d = new Date(todayUTC.getTime() - i * 86_400_000);
    const key = formatDay(d);
    days.push(byDay.get(key) ?? { day: key, upCount: 0, downCount: 0 });
  }

  const uptimeWindow = days.slice(-uptimeWindowDays);
  const totalUp = uptimeWindow.reduce((s, d) => s + d.upCount, 0);
  const totalDown = uptimeWindow.reduce((s, d) => s + d.downCount, 0);
  const totalChecks = totalUp + totalDown;
  const uptimePct = totalChecks > 0 ? (totalUp / totalChecks) * 100 : null;

  const dayFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500">{t("uptimeLabel")}</span>
          <span className="text-2xl font-semibold tabular-nums">
            {uptimePct === null ? "—" : `${uptimePct.toFixed(2)}%`}
          </span>
          <span className="text-[11px] text-zinc-500">
            {t("uptimeWindow", { days: uptimeWindowDays })}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500">{t("checksLabel")}</span>
          <span className="text-2xl font-semibold tabular-nums">{totalChecks}</span>
          <span className="text-[11px] text-zinc-500">
            {t("checksWindow", { days: uptimeWindowDays })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">
            {t("historyTitle", { days: historyDays })}
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
              dayFmt.format(new Date(`${d.day}T00:00:00Z`)),
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
        {monitorType === "heartbeat" && (
          <p className="text-[11px] text-zinc-500">{t("heartbeatNote")}</p>
        )}
      </div>
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
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
