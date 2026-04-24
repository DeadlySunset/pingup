"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API can fail on insecure contexts — silently ignore.
        }
      }}
      className={
        className ??
        "rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }
    >
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
