import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const items = t.raw("items") as string[];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← {t("back")}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-xs text-zinc-500">{t("updated")}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{t("intro")}</p>
      <ul className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
        {items.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-orange-700 dark:text-amber-400">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">{t("contact")}</p>
    </div>
  );
}
