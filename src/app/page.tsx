import Link from "next/link";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertChannels, monitors, users } from "@/lib/db/schema";
import { Sparkline } from "@/components/sparkline";
import { dismissOnboarding } from "@/app/actions/user";

type Bullet = string;
type Step = { n: string; title: string; body: string };
type FaqItem = { q: string; a: string };
type MockRow = { name: string; status: "up" | "down"; detail: string };

export default async function Home() {
  const [session, t] = await Promise.all([auth(), getTranslations()]);

  if (!session?.user?.id) {
    const heroBullets = t.raw("landing.hero.bullets") as Bullet[];
    const howSteps = t.raw("landing.how.steps") as Step[];
    const faqItems = t.raw("landing.faq.items") as FaqItem[];
    const proBullets = t.raw("landing.pro.bullets") as Bullet[];
    const mockRows = t.raw("landing.mock.rows") as MockRow[];

    async function signInGitHub() {
      "use server";
      await signIn("github", { redirectTo: "/" });
    }

    return (
      <div className="flex flex-col">
        {/* Hero with aurora + mock dashboard */}
        <div className="aurora-wrap">
          <div className="aurora-blob aurora-blob-1" aria-hidden="true" />
          <div className="aurora-blob aurora-blob-2" aria-hidden="true" />
          <div className="aurora-blob aurora-blob-3" aria-hidden="true" />
          <section className="animate-fade-in-up relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-20 pt-20 lg:grid-cols-2 lg:pt-24">
            <div className="flex flex-col items-start gap-5 text-left">
              <span className="text-xs font-medium uppercase tracking-wider text-orange-700 dark:text-amber-400">
                {t("landing.hero.kicker")}
              </span>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                {t("landing.hero.title")}
              </h1>
              <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
                {t("landing.hero.subtitle")}
              </p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {heroBullets.map((b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <span className="text-orange-600 dark:text-amber-400">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
              <form action={signInGitHub} className="mt-2 flex flex-col items-start gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-orange-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-600/25 transition-all duration-200 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/30 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:shadow-amber-500/30 dark:hover:bg-amber-400"
                >
                  {t("landing.hero.cta")}
                </button>
                <p className="text-xs text-zinc-500">{t("landing.hero.ctaNote")}</p>
              </form>
            </div>

            {/* Mock dashboard card */}
            <div className="relative">
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-2xl shadow-orange-500/10 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-amber-500/10">
                <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <LivePingDot color="emerald" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("landing.mock.statusBar")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {mockRows.map((row, idx) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {row.status === "up" ? (
                          <LivePingDot color="emerald" small />
                        ) : (
                          <LivePingDot color="rose" small />
                        )}
                        <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {row.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UptimeBar status={row.status} rowIndex={idx} />
                        <span className="text-[11px] text-zinc-500">{row.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <Sparkline label={t("landing.mock.responseTime")} />
                </div>
              </div>
              <div
                className="pointer-events-none absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-amber-300/30 via-orange-400/20 to-yellow-300/30 blur-2xl"
                aria-hidden="true"
              />
            </div>
          </section>
        </div>

        {/* Monitor types */}
        <section className="reveal-on-scroll border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("landing.types.title")}
              </h2>
              <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                {t("landing.types.subtitle")}
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <TypeCard
                tag={t("landing.types.heartbeat.tag")}
                title={t("landing.types.heartbeat.title")}
                body={t("landing.types.heartbeat.body")}
                example={t("landing.types.heartbeat.example")}
                icon="♥"
              />
              <TypeCard
                tag={t("landing.types.ping.tag")}
                title={t("landing.types.ping.title")}
                body={t("landing.types.ping.body")}
                example={t("landing.types.ping.example")}
                icon="↗"
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="reveal-on-scroll border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("landing.how.title")}
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {howSteps.map((s) => (
                <div
                  key={s.n}
                  className="card-hover flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="font-mono text-xs font-semibold text-orange-600 dark:text-amber-400">
                    {s.n}
                  </span>
                  <h3 className="text-base font-medium">{s.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Alerts */}
        <section className="reveal-on-scroll border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("landing.alerts.title")}
              </h2>
              <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                {t("landing.alerts.subtitle")}
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <AlertCard
                icon="@"
                title={t("landing.alerts.email.title")}
                body={t("landing.alerts.email.body")}
              />
              <AlertCard
                icon="✈"
                title={t("landing.alerts.telegram.title")}
                body={t("landing.alerts.telegram.body")}
              />
            </div>
          </div>
        </section>

        {/* Pro CTA */}
        <section className="reveal-on-scroll border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <div className="flex flex-col gap-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/30 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t("landing.pro.title")}
                </h2>
                <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  {t("landing.pro.subtitle")}
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                  {proBullets.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <span className="text-orange-600 dark:text-amber-400">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="/pricing"
                className="shrink-0 self-start rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400 md:self-center"
              >
                {t("landing.pro.cta")}
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="reveal-on-scroll border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("landing.faq.title")}
            </h2>
            <div className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {faqItems.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                    <span>{item.q}</span>
                    <span className="text-zinc-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="reveal-on-scroll border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.bottomCta.title")}
            </h2>
            <p className="text-base text-zinc-600 dark:text-zinc-400">
              {t("landing.bottomCta.subtitle")}
            </p>
            <form action={signInGitHub}>
              <button
                type="submit"
                className="rounded-md bg-orange-600 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
              >
                {t("landing.bottomCta.cta")}
              </button>
            </form>
          </div>
        </section>

        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-5xl px-6 py-6 text-xs text-zinc-500">
            {t("landing.footer.copyright")}
          </div>
        </footer>
      </div>
    );
  }

  const [userMonitors, locale, verifiedChannelRow, userRow] = await Promise.all([
    db
      .select()
      .from(monitors)
      .where(eq(monitors.userId, session.user.id))
      .orderBy(desc(monitors.createdAt)),
    getLocale(),
    db
      .select({ count: count() })
      .from(alertChannels)
      .where(
        and(
          eq(alertChannels.userId, session.user.id),
          isNotNull(alertChannels.verifiedAt),
        ),
      ),
    db
      .select({ dismissed: users.onboardingDismissed })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  ]);

  const verifiedChannelCount = Number(verifiedChannelRow[0]?.count ?? 0);
  const showOnboarding =
    !(userRow[0]?.dismissed ?? false) && verifiedChannelCount === 0;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">{t("home.yourMonitors")}</h1>
          <p className="text-xs text-zinc-500">
            {t("home.signedInAs", { name: session.user.name ?? session.user.email ?? "" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/channels"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t("home.channels")}
          </Link>
          <Link
            href="/monitors/new"
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
          >
            + {t("home.newMonitor")}
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t("home.signOut")}
            </button>
          </form>
        </div>
      </div>

      {showOnboarding && (
        <div className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50/60 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{t("home.onboarding.title")}</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("home.onboarding.body")}
              </span>
            </div>
            <form action={dismissOnboarding}>
              <button
                type="submit"
                aria-label={t("home.onboarding.dismiss")}
                className="rounded-md p-1.5 text-xs text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                ✕
              </button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/channels"
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
            >
              {t("home.onboarding.ctaChannels")}
            </Link>
          </div>
        </div>
      )}

      {userMonitors.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
          <p>{t("home.noMonitors")}</p>
          <Link
            href="/monitors/new"
            className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
          >
            + {t("home.newMonitor")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {userMonitors.map((m) => {
            const relPing = m.lastPingAt
              ? relativeTime(m.lastPingAt, now, rtf)
              : null;
            const dotClass =
              m.currentStatus === "up"
                ? "bg-emerald-500"
                : m.currentStatus === "down"
                  ? "bg-rose-500"
                  : "bg-zinc-300 dark:bg-zinc-600";
            return (
              <li key={m.id} className="bg-white dark:bg-zinc-900">
                <Link
                  href={`/monitors/${m.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{m.name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {t(`monitors.types.${m.type}`)}
                        {relPing ? ` · ${t("home.lastPingPrefix")} ${relPing}` : ""}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                    {t(`monitors.status.${m.currentStatus}`)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function relativeTime(then: Date, now: Date, rtf: Intl.RelativeTimeFormat): string {
  const diffMs = then.getTime() - now.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(diffMs / 86_400_000);
  return rtf.format(days, "day");
}

function TypeCard({
  tag,
  title,
  body,
  example,
  icon,
}: {
  tag: string;
  title: string;
  body: string;
  example: string;
  icon: string;
}) {
  return (
    <div className="card-hover flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-lg text-white shadow-sm shadow-orange-500/20">
          {icon}
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
          {tag}
        </span>
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <p className="mt-auto text-xs text-zinc-500">{example}</p>
    </div>
  );
}

function AlertCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card-hover flex items-start gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-lg font-semibold text-orange-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function UptimeBar({ status, rowIndex }: { status: "up" | "down"; rowIndex: number }) {
  // 24 cells visible in a 120px-wide window (5px pitch: 3px cell + 2px gap).
  // Strip holds 48 cells (two periods) and continuously slides left by one
  // period — producing a seamless flowing-data effect.
  const period = Array.from({ length: 24 }, (_, i) => {
    // Offset "down" positions per-row so each row feels independent.
    const off = (i + rowIndex * 7) % 24;
    if (status === "down" && (off === 3 || off === 4)) return "down";
    return "up";
  });
  const strip = [...period, ...period];
  return (
    <div
      className="relative hidden h-3 w-[120px] overflow-hidden sm:block"
      aria-hidden="true"
    >
      <div
        className="bar-flow absolute inset-y-0 left-0 flex gap-[2px]"
        style={{ animationDelay: `${rowIndex * -2.5}s` }}
      >
        {strip.map((c, i) => (
          <span
            key={i}
            className={
              "h-3 w-[3px] shrink-0 rounded-sm " +
              (c === "up" ? "bg-emerald-500/70" : "bg-rose-500")
            }
          />
        ))}
      </div>
    </div>
  );
}

function LivePingDot({
  color,
  small = false,
}: {
  color: "emerald" | "rose";
  small?: boolean;
}) {
  const size = small ? "h-2 w-2" : "h-2.5 w-2.5";
  const bg = color === "emerald" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <span className={`relative inline-flex shrink-0 ${size}`} aria-hidden="true">
      <span className={`ping-wave absolute inset-0 rounded-full ${bg}`} />
      <span className={`relative inline-flex h-full w-full rounded-full ${bg}`} />
    </span>
  );
}
