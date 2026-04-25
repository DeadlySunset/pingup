"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createInvoice } from "@/lib/ton/invoice";
import type { Period } from "@/lib/ton/config";

function isPeriod(v: unknown): v is Period {
  return v === "monthly" || v === "annual";
}

export async function startCheckout(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const period = formData.get("period");
  if (!isPeriod(period)) redirect("/pricing");

  const invoice = await createInvoice({ userId: session.user.id, period });
  redirect(`/subscribe/${invoice.id}`);
}
