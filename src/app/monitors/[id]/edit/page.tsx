import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { monitors } from "@/lib/db/schema";
import {
  updateHeartbeatMonitor,
  updatePingMonitor,
} from "@/app/actions/monitors";
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

export default async function EditMonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const t = await getTranslations();
  const sp = await searchParams;

  const [monitor] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, id), eq(monitors.userId, session.user.id)))
    .limit(1);
  if (!monitor) notFound();

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
        href={`/monitors/${id}`}
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {t("common.back")}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("monitors.edit.title").replace("{name}", monitor.name)}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {monitor.type === "heartbeat"
            ? t("monitors.edit.subtitleHeartbeat")
            : t("monitors.edit.subtitlePing")}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {monitor.type === "heartbeat" ? (
        <form action={updateHeartbeatMonitor} className="flex flex-col gap-5">
          <input type="hidden" name="monitorId" value={monitor.id} />

          <NameField t={t} defaultValue={monitor.name} />
          <EnabledField t={t} defaultChecked={monitor.enabled} />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.new.heartbeat.intervalLabel")}
            </legend>
            <span className="text-xs text-zinc-500">
              {t("monitors.new.heartbeat.intervalHint")}
            </span>
            <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {HEARTBEAT_INTERVALS.map((iv) => (
                <label key={iv.sec} className="cursor-pointer">
                  <input
                    type="radio"
                    name="intervalSec"
                    value={iv.sec}
                    defaultChecked={monitor.expectedIntervalSec === iv.sec}
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

          <FormActions t={t} cancelHref={`/monitors/${id}`} />
        </form>
      ) : (
        <form action={updatePingMonitor} className="flex flex-col gap-5">
          <input type="hidden" name="monitorId" value={monitor.id} />

          <NameField t={t} defaultValue={monitor.name} />
          <EnabledField t={t} defaultChecked={monitor.enabled} />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.new.ping.urlLabel")}
            </span>
            <input
              type="url"
              name="url"
              required
              defaultValue={monitor.url ?? ""}
              placeholder="https://example.com/health"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-xs text-zinc-500">
              {t("monitors.edit.ping.urlHint")}
            </span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("monitors.new.ping.intervalLabel")}
            </legend>
            <span className="text-xs text-zinc-500">
              {t("monitors.new.ping.intervalHint")}
            </span>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PING_INTERVALS.map((iv) => (
                <label key={iv.sec} className="cursor-pointer">
                  <input
                    type="radio"
                    name="intervalSec"
                    value={iv.sec}
                    defaultChecked={monitor.intervalSec === iv.sec}
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
                defaultValue={monitor.expectedStatus ?? 200}
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
                defaultValue={monitor.timeoutMs ?? 10000}
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

          <FormActions t={t} cancelHref={`/monitors/${id}`} />
        </form>
      )}
    </div>
  );
}

function NameField({
  t,
  defaultValue,
}: {
  t: (k: string) => string;
  defaultValue: string;
}) {
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
        defaultValue={defaultValue}
        placeholder={t("monitors.new.namePlaceholder")}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="text-xs text-zinc-500">{t("monitors.new.nameHint")}</span>
    </label>
  );
}

function EnabledField({
  t,
  defaultChecked,
}: {
  t: (k: string) => string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <input
        type="checkbox"
        name="enabled"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-amber-500 dark:focus:ring-amber-500"
      />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{t("monitors.edit.enabledLabel")}</span>
        <span className="text-xs text-zinc-500">
          {t("monitors.edit.enabledHint")}
        </span>
      </div>
    </label>
  );
}

function FormActions({
  t,
  cancelHref,
}: {
  t: (k: string) => string;
  cancelHref: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <SubmitButton
        pendingLabel={t("monitors.edit.saving")}
        className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] disabled:opacity-60 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
      >
        {t("monitors.edit.save")}
      </SubmitButton>
      <Link
        href={cancelHref}
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {t("common.cancel")}
      </Link>
    </div>
  );
}
