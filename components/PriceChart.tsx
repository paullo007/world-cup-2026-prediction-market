interface Point {
  time: number;
  price: number;
}

/**
 * Lightweight SVG line chart of YES probability over time. No chart lib
 * needed at this scale.
 */
export function PriceChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-sm text-slate-400">
        Price history will appear once trading starts.
      </div>
    );
  }

  const w = 600;
  const h = 180;
  const pad = 8;
  const t0 = points[0].time;
  const t1 = points[points.length - 1].time;
  const span = Math.max(t1 - t0, 1);

  const x = (t: number) => pad + ((t - t0) / span) * (w - 2 * pad);
  const y = (p: number) => h - pad - p * (h - 2 * pad);
  const path = points
    .map((pt, i) => `${i === 0 ? "M" : "L"}${x(pt.time).toFixed(1)},${y(pt.price).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1].price;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Price history">
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={pad}
            x2={w - pad}
            y1={y(g)}
            y2={y(g)}
            stroke="#243047"
            strokeDasharray="4 4"
          />
        ))}
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx={x(t1)} cy={y(last)} r="4" fill="#3b82f6" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>0%</span>
        <span>YES probability</span>
        <span>100%</span>
      </div>
    </div>
  );
}
