import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="font-mono text-5xl font-semibold text-orange-600 dark:text-amber-400">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
