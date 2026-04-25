import { describe, expect, it } from "vitest";
import { buildTonDeeplink } from "@/lib/ton/invoice";

describe("buildTonDeeplink", () => {
  const address = "EQDrjaLahKQrHKYnH2VtSCXvPS-DGEYIywiLaW0n2c4D9Pgu";

  it("converts TON to nanoton (×1e9)", () => {
    const url = new URL(buildTonDeeplink({ address, amountTon: 2.5, comment: "pu-abc" }));
    expect(url.searchParams.get("amount")).toBe("2500000000");
  });

  it("rounds the nanoton amount to integer", () => {
    // 2.825 TON × 1e9 = 2_825_000_000.0 — should still produce integer string
    const url = new URL(buildTonDeeplink({ address, amountTon: 2.825, comment: "pu-x" }));
    const amt = url.searchParams.get("amount");
    expect(amt).not.toBeNull();
    expect(/^\d+$/.test(amt!)).toBe(true);
  });

  it("encodes the comment as the `text` param", () => {
    const url = new URL(
      buildTonDeeplink({ address, amountTon: 1, comment: "pu-deadbeef00" }),
    );
    expect(url.searchParams.get("text")).toBe("pu-deadbeef00");
  });

  it("produces a ton:// URL with the address in the path", () => {
    const link = buildTonDeeplink({ address, amountTon: 1, comment: "x" });
    expect(link.startsWith(`ton://transfer/${address}?`)).toBe(true);
  });
});
