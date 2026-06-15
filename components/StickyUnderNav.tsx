"use client";

import { useEffect, useState } from "react";
import { FitToWidth } from "@/components/FitToWidth";

/**
 * Live height of the global sticky header+nav (`#wc-topbar` in app/layout.tsx),
 * so content can pin just beneath it. Re-measures on resize and when the bar
 * itself reflows. Use it as the `top` of a `position: sticky` element.
 */
export function useTopbarHeight(): number {
  const [top, setTop] = useState(0);
  useEffect(() => {
    const bar = document.getElementById("wc-topbar");
    const measure = () => setTop(bar ? bar.getBoundingClientRect().height : 0);
    measure();
    const ro = bar ? new ResizeObserver(measure) : null;
    if (bar && ro) ro.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return top;
}

/**
 * Pins its children just below the global sticky header+nav while the page
 * scrolls, wrapping them in FitToWidth so a scaled bracket row stays aligned
 * with the body below it. z-30 keeps it under the nav (z-40) so it tucks neatly
 * underneath. For a bar that should NOT scale, use `useTopbarHeight()` directly
 * with a plain `position: sticky` element.
 */
export function StickyUnderNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const top = useTopbarHeight();
  return (
    <FitToWidth className={className} style={{ position: "sticky", top, zIndex: 30 }}>
      {children}
    </FitToWidth>
  );
}
