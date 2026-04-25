import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Subscription } from "@/lib/subscription";

type Props = {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  sub: Subscription;
  verifiedChannelCount: number;
};

export async function ProfileCard({
  name,
  email,
  image,
  sub,
  verifiedChannelCount,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("profile"),
    getLocale(),
  ]);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const isPro = sub.tier === "pro";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-4">
        {image ? (
          <Image
            src={image}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xl font-semibold text-orange-700 dark:bg-amber-900/40 dark:text-amber-300">
            {(name ?? email ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{name ?? email ?? "—"}</span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                (isPro
                  ? "bg-orange-600 text-white dark:bg-amber-500 dark:text-black"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
              }
            >
              {t(`tier.${sub.tier}`)}
            </span>
          </div>
          {email && name && (
            <span className="truncate text-xs text-zinc-500">{email}</span>
          )}
          {isPro && sub.expiresAt && (
            <span className="text-xs text-zinc-500">
              {t("renewsBy", { date: dateFmt.format(sub.expiresAt) })}
            </span>
          )}
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {isPro ? t("manage") : t("upgrade")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800 sm:grid-cols-3">
        <Stat
          label={t("statMonitors")}
          value={`${sub.monitorCount} / ${sub.monitorLimit}`}
        />
        <Stat
          label={t("statChannels")}
          value={String(verifiedChannelCount)}
        />
        <Stat
          label={t("statInterval")}
          value={t("statIntervalValue", {
            n: Math.round(sub.minPingIntervalSec / 60),
          })}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
