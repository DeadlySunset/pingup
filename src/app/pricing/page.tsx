import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth, signIn } from "@/lib/auth";
import { getSubscription } from "@/lib/subscription";
import { startCheckout } from "@/app/actions/subscription";
import { TIERS } from "@/lib/ton/config";

type Reason = "monitors" | "interval" | "telegram" | "statusPage";
function isReason(v: unknown): v is Reason {
  return v === "monitors" || v === "interval" || v === "telegram" || v === "statusPage";
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const [t, session, locale] = await Promise.all([
    getTranslations("pricing"),
    auth(),
    getLocale(),
  ]);
  const sp = await searchParams;
  const reason = isReason(sp.reason) ? sp.reason : null;

  const sub = session?.user?.id ? await getSubscription(session.user.id) : null;
  const signedIn = !!session?.user?.id;
  const free = TIERS.free;
  const pro = TIERS.pro;
  const annualSavings = Math.round((1 - pro.annualUsd / (pro.monthlyUsd * 12)) * 100);

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-balance text-zinc-600 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </div>

      {reason && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t(`reason.${reason}`, {
            limit: free.maxMonitors,
            interval: Math.round(free.minPingIntervalSec / 60),
          })}
        </div>
      )}

      {sub && sub.tier === "pro" && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {t("alreadyActive", {
            until: sub.expiresAt ? dateFmt.format(sub.expiresAt) : "—",
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <PlanCard
          highlighted={false}
          name={t("tierName.free")}
          tagline={t("free.tagline")}
          priceLabel="$0"
          priceUnit={t("perMonth")}
          features={[
            t("free.features.monitors", { n: free.maxMonitors }),
            t("free.features.interval", { n: Math.round(free.minPingIntervalSec / 60) }),
            t("free.features.email"),
            t("free.features.history"),
          ]}
          cta={
            signedIn ? (
              <Link
                href="/"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {t("free.ctaSignedIn")}
              </Link>
            ) : (
              <Link
                href="/"
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
              >
                {t("free.cta")}
              </Link>
            )
          }
        />

        {/* Pro */}
        <PlanCard
          highlighted
          badge={t("pro.badge")}
          name={t("tierName.pro")}
          tagline={t("pro.tagline")}
          priceLabel={`$${pro.monthlyUsd}`}
          priceUnit={t("perMonth")}
          priceFootnote={t("paidInTon")}
          features={[
            t("pro.features.monitors", { n: pro.maxMonitors }),
            t("pro.features.interval", { n: Math.round(pro.minPingIntervalSec / 60) }),
            t("pro.features.telegram"),
            t("pro.features.statusPage"),
            t("pro.features.history"),
          ]}
          cta={
            <div className="mt-2 flex flex-col gap-2">
              {signedIn ? (
                <form action={startCheckout}>
                  <input type="hidden" name="period" value="monthly" />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
                  >
                    {t("subscribeMonthly", { price: pro.monthlyUsd })}
                  </button>
                </form>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: "/pricing" });
                  }}
                >
                  <button
                    type="submit"
                    className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
                  >
                    {t("signInFirst")}
                  </button>
                </form>
              )}
              {signedIn && (
                <form action={startCheckout}>
                  <input type="hidden" name="period" value="annual" />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    {t("subscribeAnnual", {
                      price: pro.annualUsd,
                      savings: annualSavings,
                    })}
                  </button>
                </form>
              )}
            </div>
          }
        />
      </div>

      <p className="text-center text-xs text-zinc-400">{t("footnote")}</p>
    </div>
  );
}

function PlanCard({
  name,
  tagline,
  priceLabel,
  priceUnit,
  priceFootnote,
  features,
  cta,
  highlighted,
  badge,
}: {
  name: string;
  tagline: string;
  priceLabel: string;
  priceUnit: string;
  priceFootnote?: string;
  features: string[];
  cta: React.ReactNode;
  highlighted: boolean;
  badge?: string;
}) {
  const border = highlighted
    ? "border-2 border-orange-500 dark:border-amber-500"
    : "border border-zinc-200 dark:border-zinc-800";
  return (
    <div
      className={`relative flex flex-col gap-4 rounded-lg ${border} bg-white p-6 dark:bg-zinc-900`}
    >
      {badge && (
        <span className="absolute -top-3 right-6 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white dark:bg-amber-500 dark:text-black">
          {badge}
        </span>
      )}
      <div>
        <h2 className="text-xl font-semibold">{name}</h2>
        <p className="mt-1 text-sm text-zinc-500">{tagline}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-semibold">{priceLabel}</span>
        <span className="text-sm text-zinc-500">/ {priceUnit}</span>
      </div>
      {priceFootnote && <p className="text-xs text-zinc-500">{priceFootnote}</p>}
      <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        {features.map((f, i) => (
          <li key={i}>• {f}</li>
        ))}
      </ul>
      <div className="mt-auto">{cta}</div>
    </div>
  );
}
