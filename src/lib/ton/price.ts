// TON/USD spot price from CoinGecko, cached 5 minutes. Returns USD per 1 TON.

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd";

type CoinGeckoResponse = {
  "the-open-network"?: { usd?: number };
};

export async function getTonUsdRate(): Promise<number> {
  const res = await fetch(COINGECKO_URL, {
    next: { revalidate: 300 },
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as CoinGeckoResponse;
  const rate = data["the-open-network"]?.usd;
  if (!rate || rate <= 0) throw new Error("CoinGecko: no TON price in response");
  return rate;
}

// Round UP to 2 decimals so the user sends a clean number and we don't lose to rounding.
export function usdToTon(usd: number, tonUsd: number): number {
  const raw = usd / tonUsd;
  return Math.ceil(raw * 100) / 100;
}
