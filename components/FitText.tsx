"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Scales its text down (never above `max`) so it fits within `lines` lines at
 * the current container width. Longer titles end up smaller than shorter ones.
 *
 * Optionally renders a `subtitle` below, sized relative to the fitted title
 * size (one step smaller via `subScale`) and centered.
 */
export function FitText({
  children,
  className,
  max = 28,
  min = 14,
  lines = 2,
  lineHeight = 1.15,
  subtitle,
  subtitleClassName,
  subScale = 0.8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  min?: number;
  lines?: number;
  lineHeight?: number;
  subtitle?: React.ReactNode;
  subtitleClassName?: string;
  subScale?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const o = outer.current;
    const el = inner.current;
    if (!o || !el) return;

    const fit = () => {
      let lo = min;
      let hi = max;
      let best = min;
      // Binary search the largest font size that fits within `lines` lines.
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        const maxHeight = mid * lineHeight * lines + 0.5;
        if (el.scrollHeight <= maxHeight) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      el.style.fontSize = `${best}px`;
      setSize(best);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    return () => ro.disconnect();
  }, [children, max, min, lines, lineHeight]);

  return (
    <div ref={outer} className={className}>
      <div ref={inner} style={{ fontSize: size, lineHeight }}>
        {children}
      </div>
      {subtitle != null && (
        <div
          className={subtitleClassName}
          style={{ fontSize: Math.round(size * subScale), lineHeight: 1.2 }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
