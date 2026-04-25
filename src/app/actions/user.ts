"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function dismissOnboarding() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  await db
    .update(users)
    .set({ onboardingDismissed: true })
    .where(eq(users.id, session.user.id));
  revalidatePath("/");
}
