import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'monitor' AND column_name = 'publicSlug'
    `;
    if (cols.length === 0) {
      await sql`ALTER TABLE "monitor" ADD COLUMN "publicSlug" text`;
      await sql`ALTER TABLE "monitor" ADD CONSTRAINT "monitor_publicSlug_unique" UNIQUE ("publicSlug")`;
      console.log('+ monitor.publicSlug + UNIQUE');
    } else {
      console.log('= monitor.publicSlug already present');
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
