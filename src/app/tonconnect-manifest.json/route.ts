import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const manifest = {
    url: appUrl,
    name: "Pingup",
    iconUrl: `${appUrl}/icon.svg`,
    termsOfUseUrl: `${appUrl}/terms`,
    privacyPolicyUrl: `${appUrl}/privacy`,
  };
  return NextResponse.json(manifest, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
