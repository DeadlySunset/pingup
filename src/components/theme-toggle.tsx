"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const icon = !mounted ? "·" : resolvedTheme === "dark" ? "☀" : "☾";

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
    >
      {icon}
    </button>
  );
}
