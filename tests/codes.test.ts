import { describe, expect, it } from "vitest";
import {
  generateVerificationCode,
  VERIFICATION_CODE_ALPHABET,
  VERIFICATION_CODE_LENGTH,
} from "@/lib/alerts/codes";

describe("generateVerificationCode", () => {
  it("produces a 6-character code", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateVerificationCode().length).toBe(VERIFICATION_CODE_LENGTH);
    }
  });

  it("uses only the lookalike-free alphabet", () => {
    const allowed = new Set(VERIFICATION_CODE_ALPHABET);
    for (let i = 0; i < 100; i++) {
      const code = generateVerificationCode();
      for (const ch of code) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it("does not contain visually confusable digits or letters", () => {
    const banned = ["0", "O", "1", "I"];
    for (const ch of banned) {
      expect(VERIFICATION_CODE_ALPHABET.includes(ch)).toBe(false);
    }
  });

  it("produces enough variation across many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(generateVerificationCode());
    // 32^6 ≈ 1B possible codes — collisions in 200 draws are vanishingly rare.
    expect(seen.size).toBe(200);
  });
});
