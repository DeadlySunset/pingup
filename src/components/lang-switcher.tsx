import { getLocale } from "next-intl/server";
import { setLocale } from "@/app/actions/i18n";
import { LOCALES, type Locale } from "@/i18n/request";

const LABELS: Record<Locale, string> = { en: "EN", ru: "RU" };

export async function LangSwitcher() {
  const current = (await getLocale()) as Locale;

  return (
    <div className="flex items-center gap-1 rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
      {LOCALES.map((loc) => {
        const isActive = loc === current;
        return (
          <form
            key={loc}
            action={async () => {
              "use server";
              await setLocale(loc);
            }}
          >
            <button
              type="submit"
              aria-pressed={isActive}
              className={
                "rounded px-2 py-0.5 text-xs font-medium " +
                (isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800")
              }
            >
              {LABELS[loc]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
