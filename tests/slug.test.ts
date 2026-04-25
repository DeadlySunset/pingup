import { describe, expect, it } from "vitest";
import { generatePublicSlug, PUBLIC_SLUG_LENGTH } from "@/lib/monitors/slug";

describe("generatePublicSlug", () => {
  it("returns a string of the documented length", () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePublicSlug().length).toBe(PUBLIC_SLUG_LENGTH);
    }
  });

  it("contains only URL-safe lowercase hex characters", () => {
    const re = /^[0-9a-f]+$/;
    for (let i = 0; i < 100; i++) {
      expect(re.test(generatePublicSlug())).toBe(true);
    }
  });

  it("is unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generatePublicSlug());
    expect(seen.size).toBe(500);
  });
});
