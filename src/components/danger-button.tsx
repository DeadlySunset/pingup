"use client";

import { useTransition } from "react";

// Server action pattern with a JS-side confirm() prompt. The action is passed
// as a prop and called imperatively, mirroring commitcast's pattern.
export function DangerButton({
  action,
  confirm,
  pendingLabel,
  children,
  className,
}: {
  action: () => Promise<void> | void;
  confirm: string;
  pendingLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        startTransition(async () => {
          await action();
        });
      }}
      className={
        className ??
        "rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
      }
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
