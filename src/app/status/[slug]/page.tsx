import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { monitors } from "@/lib/db/schema";
import { UptimeBar } from "@/components/uptime-bar";

export const dynamic = "force-dynamic";

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

      <UptimeBar monitorId={monitor.id} />

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

