// Public-status slug — appears in URLs like /status/{slug}, so it must be
// URL-safe and unguessable enough that scanning isn't practical.
// 12 hex chars = 16^12 ≈ 2.8e14 possible values.
export const PUBLIC_SLUG_LENGTH = 12;

export function generatePublicSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, PUBLIC_SLUG_LENGTH);
}
