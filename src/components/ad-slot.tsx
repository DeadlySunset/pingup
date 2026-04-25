import Link from "next/link";
import { getTranslations } from "next-intl/server";

// House-ad slot: rendered only for Free users.
// Pluggable via env (so a single sponsor card can be swapped without a deploy):
//   ADS_TITLE / ADS_BODY / ADS_URL / ADS_CTA
// When unset, falls back to an upgrade-to-Pro card. No 3rd-party scripts.
export async function AdSlot() {
  const t = await getTranslations("ads");

  const title = process.env.ADS_TITLE?.trim();
  const body = process.env.ADS_BODY?.trim();
  const url = process.env.ADS_URL?.trim();
  const cta = process.env.ADS_CTA?.trim();

  const hasSponsor = !!(title && body && url);

  return (
    <aside
      aria-label={t("label")}
      className="flex flex-col gap-3 rounded-lg border border-dashed border-orange-300/60 bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:border-amber-700/40 dark:from-amber-950/30 dark:to-orange-950/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:text-amber-400">
          {hasSponsor ? t("sponsored") : t("upsell.kicker")}
        </span>
        <Link
          href="/pricing"
          className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
        >
          {t("removeAds")}
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold">
          {hasSponsor ? title : t("upsell.title")}
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {hasSponsor ? body : t("upsell.body")}
        </p>
      </div>

      {hasSponsor ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener sponsored"
          className="self-start rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
        >
          {cta ?? t("upsell.cta")}
        </a>
      ) : (
        <Link
          href="/pricing"
          className="self-start rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
        >
          {t("upsell.cta")}
        </Link>
      )}
    </aside>
  );
}
