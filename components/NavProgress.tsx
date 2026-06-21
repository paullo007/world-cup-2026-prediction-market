"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Gold navigation progress bar pinned to the BOTTOM EDGE of the black header
 * box (rendered inside it, so it spans the box width). On any internal link/tab
 * click it sweeps left → right; it snaps to the right edge when the new route
 * lands, then fades. Replaces the top-of-viewport nextjs-toploader.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const routeKey = `${pathname}?${search.toString()}`;
  const prevKey = useRef(routeKey);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  // Start the bar on any same-tab click of an internal link (covers the tabs,
  // which are <Link>s, plus Markets/Portfolio/etc.).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return; // internal navigations only
      setPhase("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Complete + fade once the path or query actually changes.
  useEffect(() => {
    if (routeKey === prevKey.current) return;
    prevKey.current = routeKey;
    setPhase("done");
    const t = window.setTimeout(() => setPhase("idle"), 450);
    return () => clearTimeout(t);
  }, [routeKey]);

  const width = phase === "loading" ? "90%" : phase === "done" ? "100%" : "0%";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[4px] overflow-hidden">
      <div
        className="h-full bg-amber-400"
        style={{
          width,
          opacity: phase === "idle" ? 0 : 1,
          transition:
            phase === "loading"
              ? "width 1.2s ease-out"
              : phase === "done"
                ? "width 0.2s ease-out, opacity 0.3s ease-in 0.2s"
                : "opacity 0.3s",
          boxShadow: "0 0 8px #fbbf24, 0 0 4px #fbbf24",
        }}
      />
    </div>
  );
}
