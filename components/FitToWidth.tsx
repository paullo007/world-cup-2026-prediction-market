"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Scales fixed-width content (e.g. the knockout bracket) down so it always fits
 * the available width on any screen — no horizontal scrolling in the common case.
 *
 * How it works: the child keeps its natural design width; we measure that vs. the
 * container's available width and apply a CSS `transform: scale()`. A middle box
 * is sized to the *scaled* dimensions so the layout box matches what you see (no
 * empty gap below, correct scroll range). Below `minScale` we stop shrinking and
 * let the container scroll instead, so content never becomes unreadably tiny.
 */
export function FitToWidth({
  minScale = 0.5,
  className,
  children,
}: {
  minScale?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const recompute = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    // scrollWidth/Height ignore the transform, so this is the natural design size.
    const natural = inner.scrollWidth;
    const naturalH = inner.scrollHeight;
    if (!natural) return;
    const available = outer.clientWidth;
    const next = Math.min(1, Math.max(minScale, available / natural));
    setScale((prev) => (Math.abs(prev - next) > 0.001 ? next : prev));
    setDims((prev) => (prev && prev.w === natural && prev.h === naturalH ? prev : { w: natural, h: naturalH }));
  }, [minScale]);

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(recompute);
    if (outerRef.current) ro.observe(outerRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  return (
    <div ref={outerRef} className={className} style={{ overflowX: scale <= minScale ? "auto" : "hidden" }}>
      <div style={dims ? { width: dims.w * scale, height: dims.h * scale } : undefined}>
        <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "max-content" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
