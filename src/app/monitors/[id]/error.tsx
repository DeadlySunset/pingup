"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function MonitorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[monitors/[id]/error.tsx]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-12">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {t("backHome")}
      </Link>
      <h1 className="text-xl font-semibold">{t("monitorTitle")}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("monitorBody")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
        >
          {t("tryAgain")}
        </button>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t("allMonitors")}
        </Link>
      </div>
      {error.digest && (
        <p className="font-mono text-[11px] text-zinc-400">ref · {error.digest}</p>
      )}
    </div>
  );
}
