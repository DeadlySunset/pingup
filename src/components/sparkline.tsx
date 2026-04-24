import { ResponseValue } from "./response-value";

// One period of response-time values. The last value is close to the first so
// the duplicated pattern loops seamlessly when the whole thing slides left.
const UNIQUE = [
  42, 38, 44, 34, 40, 28, 36, 30, 32, 26, 24, 30, 22, 28, 20, 24, 22, 18, 26, 40,
];
const PERIOD_W = 320;
const H = 72;
const STEP = PERIOD_W / UNIQUE.length; // pitch between points

// Duplicate so we can translate by exactly PERIOD_W and loop seamlessly.
const LOOP = [...UNIQUE, ...UNIQUE];
const MAX = Math.max(...UNIQUE);
const MIN = Math.min(...UNIQUE);
const scale = (v: number) => H - ((v - MIN) / (MAX - MIN || 1)) * (H - 14) - 7;

const LINE_PATH = LOOP.map(
  (v, i) => `${i === 0 ? "M" : "L"}${(i * STEP).toFixed(1)},${scale(v).toFixed(1)}`,
).join(" ");
const TOTAL_W = STEP * (LOOP.length - 1);
const AREA_PATH = `${LINE_PATH} L${TOTAL_W.toFixed(1)},${H} L0,${H} Z`;

// Static end-dot at the right edge of the visible window. The Y follows the
// point that happens to be at the right edge at t=0 — viewers won't notice
// the slight drift as the line flows.
const END_Y = scale(UNIQUE[UNIQUE.length - 1]);

export function Sparkline({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <span className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
          <ResponseValue />
          <span className="ml-0.5 text-[10px] font-normal text-zinc-500">ms</span>
        </span>
      </div>
      <div className="relative overflow-hidden">
        <svg
          viewBox={`0 0 ${PERIOD_W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
          className="block"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="spark-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="spark-line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(245 158 11)" />
              <stop offset="100%" stopColor="rgb(249 115 22)" />
            </linearGradient>
          </defs>
          <g className="spark-flow">
            <path d={AREA_PATH} fill="url(#spark-area-grad)" className="spark-area" />
            <path
              d={LINE_PATH}
              stroke="url(#spark-line-grad)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="spark-line"
            />
          </g>
          {/* Static end-dot — sits at the right edge, pulses gently. */}
          <circle
            cx={PERIOD_W}
            cy={END_Y}
            r="6"
            fill="rgb(249 115 22)"
            className="spark-pulse"
            opacity="0.3"
          />
          <circle cx={PERIOD_W} cy={END_Y} r="3" fill="rgb(249 115 22)" />
        </svg>
      </div>
    </div>
  );
}
