import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const tableExists = await sql`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice' LIMIT 1
    `;
    if (tableExists.length === 0) {
      await sql`
        CREATE TABLE "invoice" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "comment" text NOT NULL UNIQUE,
          "period" text NOT NULL,
          "usdAmount" text NOT NULL,
          "tonAmount" text NOT NULL,
          "tonRateUsd" text NOT NULL,
          "status" text NOT NULL DEFAULT 'pending',
          "txHash" text,
          "paidAt" timestamp,
          "expiresAt" timestamp NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX "invoice_userId_idx" ON "invoice" ("userId")`;
      await sql`CREATE INDEX "invoice_status_idx" ON "invoice" ("status")`;
      console.log("+ table invoice");
    } else {
      console.log("= table invoice already exists");
    }
    console.log("done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
