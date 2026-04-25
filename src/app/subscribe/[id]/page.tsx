import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { buildTonDeeplink } from "@/lib/ton/invoice";
import { PAYMENT_ADDRESS } from "@/lib/ton/config";
import { checkPayments } from "@/lib/ton/watcher";
import { CopyButton } from "@/components/copy-button";
import { TonPayButton } from "@/components/ton-pay-button";

async function renderQRSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#18181b", light: "#ffffff" },
  });
}

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [t, locale] = await Promise.all([getTranslations("subscribe"), getLocale()]);

  // Opportunistic on-demand check — users actively waiting shouldn't have to
  // wait for the every-minute cron tick.
  await checkPayments().catch(() => undefined);

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))
    .limit(1);

  if (!invoice) notFound();

  const now = new Date();
  const expired =
    invoice.status === "expired" ||
    (invoice.status === "pending" && invoice.expiresAt <= now);

  if (invoice.status === "paid") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950">
          ✓
        </div>
        <h1 className="text-2xl font-semibold">{t("paidTitle")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("paidBody")}</p>
        <Link
          href="/"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
        >
          {t("backHome")}
        </Link>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("expiredTitle")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("expiredBody")}</p>
        <Link
          href="/pricing"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-700 active:scale-[0.98] dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
        >
          {t("backToPricing")}
        </Link>
      </div>
    );
  }

  const tonAmount = Number.parseFloat(invoice.tonAmount);
  const deeplink = buildTonDeeplink({
    address: PAYMENT_ADDRESS,
    amountTon: tonAmount,
    comment: invoice.comment,
  });
  const qrSvg = await renderQRSvg(deeplink);
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: "short" });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      {/* Meta refresh polls until the watcher flips the invoice to paid */}
      <meta httpEquiv="refresh" content="10" />

      <Link
        href="/pricing"
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← {t("backToPricing")}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-zinc-500">
          {t("subtitle", { period: t(`period.${invoice.period}`) })}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <TonPayButton
          address={PAYMENT_ADDRESS}
          amountTon={tonAmount}
          comment={invoice.comment}
        />
      </div>

      <details className="group rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          <span>{t("manualTitle")}</span>
          <span className="text-zinc-400 transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="rounded-lg bg-white p-2"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <a
            href={deeplink}
            className="text-xs font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            {t("openInWallet")}
          </a>
        </div>
      </details>

      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <dt className="text-zinc-500">{t("amount")}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono">{tonAmount.toFixed(2)} TON</span>
          <span className="text-xs text-zinc-400">≈ ${Number.parseFloat(invoice.usdAmount).toFixed(2)}</span>
          <CopyButton text={tonAmount.toFixed(2)} />
        </dd>

        <dt className="text-zinc-500">{t("address")}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-xs break-all">{PAYMENT_ADDRESS}</span>
          <CopyButton text={PAYMENT_ADDRESS} />
        </dd>

        <dt className="text-zinc-500">{t("comment")}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-xs">{invoice.comment}</span>
          <CopyButton text={invoice.comment} />
        </dd>

        <dt className="text-zinc-500">{t("expiresAt")}</dt>
        <dd className="text-xs text-zinc-600 dark:text-zinc-400">{timeFmt.format(invoice.expiresAt)}</dd>
      </dl>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        {t("commentWarning")}
      </div>

      <p className="text-xs text-zinc-500">{t("pollingHint")}</p>
    </div>
  );
}
