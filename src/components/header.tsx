import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LangSwitcher } from "./lang-switcher";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const t = await getTranslations("header");
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200/60 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/70">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight transition-colors hover:text-orange-600 dark:hover:text-amber-400"
      >
        ping<span className="text-orange-600 dark:text-amber-400">up</span>
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/pricing"
          className="rounded-md px-2.5 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {t("pricing")}
        </Link>
        <LangSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
