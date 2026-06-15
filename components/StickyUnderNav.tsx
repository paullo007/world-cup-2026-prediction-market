"use client";

import { useEffect, useState } from "react";
import { FitToWidth } from "@/components/FitToWidth";

/**
 * Pins its children just below the global sticky header+nav (the `#wc-topbar`
 * block in app/layout.tsx) while the page scrolls. It measures that bar's live
 * height so the offset stays correct even as the header reflows, and wraps the
 * content in FitToWidth so a scaled bracket row stays aligned with the body
 * below it. z-30 keeps it under the nav (z-40) so it tucks neatly underneath.
 */
export function StickyUnderNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

  return (
    <FitToWidth className={className} style={{ position: "sticky", top, zIndex: 30 }}>
      {children}
    </FitToWidth>
  );
}
