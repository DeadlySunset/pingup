import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import {
  INVOICE_TTL_MINUTES,
  PAYMENT_ADDRESS,
  priceFor,
  type Period,
} from "./config";
import { getTonUsdRate, usdToTon } from "./price";

type CreateInvoiceInput = {
  userId: string;
  period: Period;
};

export type CreatedInvoice = {
  id: string;
  comment: string;
  period: Period;
  usdAmount: number;
  tonAmount: number;
  tonRateUsd: number;
  expiresAt: Date;
};

function makeComment(): string {
  return `pu-${randomBytes(6).toString("hex")}`;
}

export async function createInvoice({
  userId,
  period,
}: CreateInvoiceInput): Promise<CreatedInvoice> {
  if (!PAYMENT_ADDRESS) {
    throw new Error("TON_PAYMENT_ADDRESS is not set");
  }

  const usdAmount = priceFor(period);
  const tonRateUsd = await getTonUsdRate();
  const tonAmount = usdToTon(usdAmount, tonRateUsd);
  const expiresAt = new Date(Date.now() + INVOICE_TTL_MINUTES * 60_000);

  const comment = makeComment();

  const [row] = await db
    .insert(invoices)
    .values({
      userId,
      comment,
      period,
      usdAmount: usdAmount.toFixed(2),
      tonAmount: tonAmount.toFixed(9),
      tonRateUsd: tonRateUsd.toFixed(6),
      status: "pending",
      expiresAt,
    })
    .returning({ id: invoices.id });

  return {
    id: row.id,
    comment,
    period,
    usdAmount,
    tonAmount,
    tonRateUsd,
    expiresAt,
  };
}

// ton:// deeplink — Tonkeeper, Tonhub, MyTonWallet all parse this.
// https://github.com/tonkeeper/wallet-api/blob/main/source/ton-link.md
export function buildTonDeeplink(opts: {
  address: string;
  amountTon: number;
  comment: string;
}): string {
  const amountNano = Math.round(opts.amountTon * 1e9);
  const params = new URLSearchParams({
    amount: amountNano.toString(),
    text: opts.comment,
  });
  return `ton://transfer/${opts.address}?${params.toString()}`;
}
