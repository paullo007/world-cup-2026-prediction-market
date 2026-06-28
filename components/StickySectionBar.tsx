"use client";

import { useTopbarHeight } from "@/components/StickyUnderNav";

/**
 * Full-width green section header for the "All Predictions Available" tab (same
 * green as the "Bracket by FIFA" button). Pins just under the global nav while
 * its section scrolls — each section's bar replaces the previous one as you go.
 */
export function StickySectionBar({ title }: { title: string }) {
  const top = useTopbarHeight();
  return (
    <div
      className="sticky z-30 rounded-lg bg-emerald-500 px-4 py-3 text-center text-base font-extrabold tracking-wide text-white shadow-sm"
      style={{ top }}
    >
      {title}
    </div>
  );
}
