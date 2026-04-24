"use client";

import { useEffect, useState } from "react";

// Cycles through plausible response-time readings to match the moving chart.
const VALUES = [22, 24, 19, 27, 23, 21, 26, 18, 25, 22];

export function ResponseValue() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % VALUES.length), 1100);
    return () => clearInterval(id);
  }, []);
  return <>{VALUES[idx]}</>;
}
