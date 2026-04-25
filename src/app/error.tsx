"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Surface in dev console; prod logging hooks land later.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl dark:bg-rose-950">
        ⚠
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("body")}</p>
      {error.digest && (
        <p className="font-mono text-[11px] text-zinc-400">ref · {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
