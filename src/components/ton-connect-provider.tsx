"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function TonConnectProvider({
  manifestUrl,
  children,
}: {
  manifestUrl: string;
  children: React.ReactNode;
}) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>{children}</TonConnectUIProvider>
  );
}
