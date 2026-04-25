import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { TonConnectProvider } from "@/components/ton-connect-provider";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pingup — uptime and cron monitoring for indie devs",
  description:
    "Pingup watches your URLs and cron jobs. Heartbeat and ping monitors, alerts to email and Telegram. Simple, dev-friendly, pay in TON.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const manifestUrl = `${appUrl}/tonconnect-manifest.json`;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TonConnectProvider manifestUrl={manifestUrl}>
              <Header />
              <main className="flex flex-1 flex-col">{children}</main>
            </TonConnectProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
