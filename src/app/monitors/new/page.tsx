import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { createHeartbeatMonitor, createPingMonitor } from "@/app/actions/monitors";
import { SubmitButton } from "@/components/submit-button";

const HEARTBEAT_INTERVALS = [
  { sec: 5 * 60, labelKey: "5m" },
  { sec: 15 * 60, labelKey: "15m" },
  { sec: 30 * 60, labelKey: "30m" },
  { sec: 60 * 60, labelKey: "1h" },
  { sec: 6 * 3600, labelKey: "6h" },
  { sec: 24 * 3600, labelKey: "24h" },
] as const;

const PING_INTERVALS = [
  { sec: 60, labelKey: "1m" },
  { sec: 5 * 60, labelKey: "5m" },
  { sec: 15 * 60, labelKey: "15m" },
  { sec: 60 * 60, labelKey: "1h" },
] as const;

const EXPECTED_STATUSES = [200, 201, 204, 301, 302] as const;
const TIMEOUT_OPTIONS = [
  { ms: 5000, labelKey: "5s" },
  { ms: 10000, labelKey: "10s" },
  { ms: 20000, labelKey: "20s" },
] as const;

type MonitorType = "heartbeat" | "ping";

export default async function NewMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const t = await getTranslations();
  const sp = await searchParams;

  const type: MonitorType = sp.type === "ping" ? "ping" : "heartbeat";

  const errorMap: Record<string, string> = {
    name: t("monitors.new.errors.name"),
    interval: t("monitors.new.errors.interval"),
    url: t("monitors.new.errors.url"),
    status: t("monitors.new.errors.status"),
    timeout: t("monitors.new.errors.timeout"),
  };
  const errorMessage = sp.error ? (errorMap[sp.error] ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {t("common.back")}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {type === "heartbeat"
            ? t("monitors.new.heartbeat.title")
            : t("monitors.new.ping.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {type === "heartbeat"
            ? t("monitors.new.heartbeat.subtitle")
            : t("monitors.new.ping.subtitle")}
        </p>
      </div>

      {/* Type tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <TabLink active={type === "heartbeat"} href="/monitors/new?type=heartbeat">
          <span className="mr-2">♥</span>
          {t("monitors.types.heartbeat")}
        </TabLink>
        <TabLink active={type === "ping"} href="/monitors/new?type=ping">
          <span className="mr-2">↗</span>
          {t("monitors.types.ping")}
        </TabLink>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {type === "heartbeat" ? (
        <form action={createHeartbeatMonitor} className="flex flex-col gap-5">
          <NameField t={t} />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.new.heartbeat.intervalLabel")}
            </legend>
            <span className="text-xs text-zinc-500">
              {t("monitors.new.heartbeat.intervalHint")}
            </span>
            <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {HEARTBEAT_INTERVALS.map((iv, idx) => (
                <label key={iv.sec} className="cursor-pointer">
                  <input
                    type="radio"
                    name="intervalSec"
                    value={iv.sec}
                    defaultChecked={idx === 2}
                    className="peer sr-only"
                    required
                  />
                  <span className="flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition-colors peer-checked:border-orange-600 peer-checked:bg-orange-50 peer-checked:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:peer-checked:border-amber-500 dark:peer-checked:bg-amber-950/40 dark:peer-checked:text-amber-400">
                    {t(`monitors.intervals.${iv.labelKey}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormActions t={t} pendingKey="creating" submitKey="create" />
        </form>
      ) : (
        <form action={createPingMonitor} className="flex flex-col gap-5">
          <NameField t={t} />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.new.ping.urlLabel")}
            </span>
            <input
              type="url"
              name="url"
              required
              placeholder="https://example.com/health"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-xs text-zinc-500">{t("monitors.new.ping.urlHint")}</span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.new.ping.intervalLabel")}
            </legend>
            <span className="text-xs text-zinc-500">
              {t("monitors.new.ping.intervalHint")}
            </span>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PING_INTERVALS.map((iv, idx) => (
                <label key={iv.sec} className="cursor-pointer">
                  <input
                    type="radio"
                    name="intervalSec"
                    value={iv.sec}
                    defaultChecked={idx === 1}
                    className="peer sr-only"
                    required
                  />
                  <span className="flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition-colors peer-checked:border-orange-600 peer-checked:bg-orange-50 peer-checked:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:peer-checked:border-amber-500 dark:peer-checked:bg-amber-950/40 dark:peer-checked:text-amber-400">
                    {t(`monitors.intervals.${iv.labelKey}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t("monitors.new.ping.statusLabel")}
              </span>
              <select
                name="expectedStatus"
                defaultValue={200}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {EXPECTED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">
                {t("monitors.new.ping.statusHint")}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t("monitors.new.ping.timeoutLabel")}
              </span>
              <select
                name="timeoutMs"
                defaultValue={10000}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {TIMEOUT_OPTIONS.map((opt) => (
                  <option key={opt.ms} value={opt.ms}>
                    {t(`monitors.timeouts.${opt.labelKey}`)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">
                {t("monitors.new.ping.timeoutHint")}
              </span>
            </label>
          </div>

          <FormActions t={t} pendingKey="creating" submitKey="create" />
        </form>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-white text-orange-700 shadow-sm dark:bg-zinc-800 dark:text-amber-400"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
      }
    >
      {children}
    </Link>
  );
}

function NameField({ t }: { t: (k: string) => string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {t("monitors.new.nameLabel")}
      </span>
      <input
        type="text"
        name="name"
        required
        maxLength={100}
        placeholder={t("monitors.new.namePlaceholder")}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="text-xs text-zinc-500">{t("monitors.new.nameHint")}</span>
    </label>
  );
}

function FormActions({
  t,
  pendingKey,
  submitKey,
}: {
  t: (k: string) => string;
  pendingKey: string;
  submitKey: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <SubmitButton
        pendingLabel={t(`monitors.new.${pendingKey}`)}
        className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] disabled:opacity-60 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
      >
        {t(`monitors.new.${submitKey}`)}
      </SubmitButton>
      <Link
        href="/"
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {t("common.cancel")}
      </Link>
    </div>
  );
}
