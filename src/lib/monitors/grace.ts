// Grace = 20% of expected interval, floored at 60s so tiny intervals still get
// headroom. Heartbeats that miss this window are flagged down by the tick.
export function computeGrace(intervalSec: number): number {
  return Math.max(60, Math.round(intervalSec * 0.2));
}
