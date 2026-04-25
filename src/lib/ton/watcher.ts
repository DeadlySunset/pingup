import { and, eq, inArray, lt, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, users } from "@/lib/db/schema";
import {
  daysFor,
  PAYMENT_ADDRESS,
  PAYMENT_TOLERANCE,
  TONCENTER_API_KEY,
  TONCENTER_BASE_URL,
} from "./config";

type ToncenterTx = {
  transaction_id: { hash: string; lt: string };
  in_msg?: {
    source?: string;
    destination?: string;
    value?: string; // nanotons as string
    message?: string; // text comment, decoded by toncenter
  };
  utime: number;
};

type ToncenterResponse = {
  ok: boolean;
  result?: ToncenterTx[];
  error?: string;
};

export type WatcherResult = {
  checked: number;
  matched: number;
  activated: Array<{
    userId: string;
    invoiceId: string;
    period: string;
    txHash: string;
  }>;
  skipped: Array<{ reason: string; hash?: string }>;
};

async function fetchIncomingTx(limit = 50): Promise<ToncenterTx[]> {
  if (!PAYMENT_ADDRESS) throw new Error("TON_PAYMENT_ADDRESS is not set");

  const params = new URLSearchParams({
    address: PAYMENT_ADDRESS,
    limit: String(limit),
  });
  if (TONCENTER_API_KEY) params.set("api_key", TONCENTER_API_KEY);

  const res = await fetch(`${TONCENTER_BASE_URL}/getTransactions?${params.toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`toncenter ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as ToncenterResponse;
  if (!data.ok || !data.result) {
    throw new Error(`toncenter error: ${data.error ?? "unknown"}`);
  }
  return data.result;
}

export async function checkPayments(): Promise<WatcherResult> {
  const result: WatcherResult = { checked: 0, matched: 0, activated: [], skipped: [] };

  const txs = await fetchIncomingTx(50);
  result.checked = txs.length;

  // Filter to incoming txs whose comment matches our invoice prefix.
  const candidates = txs.filter((tx) => {
    const msg = tx.in_msg;
    if (!msg) return false;
    if (!msg.value || msg.value === "0") return false;
    if (!msg.message || !msg.message.startsWith("pu-")) return false;
    return true;
  });

  if (candidates.length === 0) return result;

  const comments = candidates.map((tx) => tx.in_msg!.message!);
  const existing = await db
    .select()
    .from(invoices)
    .where(inArray(invoices.comment, comments));

  const byComment = new Map(existing.map((inv) => [inv.comment, inv]));
  const txHashes = new Set(existing.filter((i) => i.txHash).map((i) => i.txHash!));

  for (const tx of candidates) {
    const comment = tx.in_msg!.message!;
    const hash = tx.transaction_id.hash;

    if (txHashes.has(hash)) {
      result.skipped.push({ reason: "already processed", hash });
      continue;
    }

    const invoice = byComment.get(comment);
    if (!invoice) {
      result.skipped.push({ reason: "no matching invoice", hash });
      continue;
    }
    if (invoice.status === "paid") {
      result.skipped.push({ reason: "invoice already paid", hash });
      continue;
    }
    if (invoice.status === "expired") {
      result.skipped.push({ reason: "invoice expired", hash });
      continue;
    }

    const paidNano = BigInt(tx.in_msg!.value!);
    const expectedTon = Number.parseFloat(invoice.tonAmount);
    const expectedNano = BigInt(Math.round(expectedTon * 1e9 * PAYMENT_TOLERANCE));

    if (paidNano < expectedNano) {
      result.skipped.push({
        reason: `underpaid: got ${paidNano} nano, expected ${expectedNano}`,
        hash,
      });
      continue;
    }

    const days = daysFor(invoice.period);

    const [existingUser] = await db
      .select({
        tier: users.subscriptionTier,
        expires: users.subscriptionExpiresAt,
      })
      .from(users)
      .where(eq(users.id, invoice.userId))
      .limit(1);

    // Stack renewals: extend from later of (now, current expiry).
    const now = new Date();
    const stillPro =
      existingUser?.tier === "pro" &&
      existingUser?.expires &&
      existingUser.expires > now;
    const base = stillPro ? existingUser!.expires! : now;
    const newExpiry = new Date(base.getTime() + days * 86_400_000);

    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({ status: "paid", txHash: hash, paidAt: now })
        .where(and(eq(invoices.id, invoice.id), eq(invoices.status, "pending")));

      await tx
        .update(users)
        .set({ subscriptionTier: "pro", subscriptionExpiresAt: newExpiry })
        .where(eq(users.id, invoice.userId));
    });

    result.matched++;
    result.activated.push({
      userId: invoice.userId,
      invoiceId: invoice.id,
      period: invoice.period,
      txHash: hash,
    });
  }

  return result;
}

// Daily housekeeping: downgrade users whose subscription has run out;
// mark stale pending invoices as expired.
export async function runExpiryPass(): Promise<{ downgraded: number; invoicesExpired: number }> {
  const now = new Date();

  const expired = await db
    .update(invoices)
    .set({ status: "expired" })
    .where(and(eq(invoices.status, "pending"), lt(invoices.expiresAt, now)))
    .returning({ id: invoices.id });

  const downgrades = await db
    .update(users)
    .set({ subscriptionTier: "free", subscriptionExpiresAt: null })
    .where(
      and(
        eq(users.subscriptionTier, "pro"),
        or(isNull(users.subscriptionExpiresAt), lt(users.subscriptionExpiresAt, now)),
      ),
    )
    .returning({ id: users.id });

  return { downgraded: downgrades.length, invoicesExpired: expired.length };
}
