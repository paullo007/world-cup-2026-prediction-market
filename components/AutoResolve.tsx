"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible self-heal: on every page load, ping the throttled /api/auto-resolve
 * so finished matches get settled just by someone viewing the site — no reliance
 * on a scheduler. If anything was actually published, refresh the route so the
 * new results show without a manual reload. Mounted once in the root layout.
 */
export function AutoResolve() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    fetch("/api/auto-resolve", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.published > 0) router.refresh();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router]);
  return null;
}
