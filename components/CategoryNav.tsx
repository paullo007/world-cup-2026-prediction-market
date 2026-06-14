"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "Tournament Winner",
  "Matches",
  "Brazil",
  "Bracket",
  "AI Knockouts",
  "Standings",
  "Scores",
  "Goals",
  "Crazy Predictions",
  "Results",
];

// Pills that navigate to a standalone tab page rather than filtering the home grid.
const TAB_ROUTES: Record<string, string> = {
  Brazil: "/brazil",
  Bracket: "/bracket",
  "AI Knockouts": "/ai-knockouts",
  Standings: "/standings",
  Scores: "/scores",
  Goals: "/goals",
};

// Inverse of TAB_ROUTES, for highlighting the active pill on a standalone page.
const ROUTE_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([cat, route]) => [route, cat])
);

// Display overrides: pill text differs from the underlying category value/key
// (which must stay in sync with the market `category` stored in the DB).
const LABELS: Record<string, string> = {
  "Tournament Winner": "Predict World Cup Winner",
};

/**
 * Permanent "Update Latest Results" pill. POSTs to /api/refresh-results, which
 * (for any signed-in user, on every click — no cooldown) fetches the score
 * sources and auto-publishes any finished match on the spot, then re-queries the
 * page data via router.refresh() so everyone sees the fresh scores. A pop-up
 * message (toast) reports the outcome ("N matches were updated" / "No new
 * results" / an error). Anonymous visitors just get the display refresh.
 */
function UpdateResultsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    let msg = "Results refreshed";
    let tone: "ok" | "err" = "ok";
    try {
      const res = await fetch("/api/refresh-results", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data?.reason === "auth") {
        msg = "Sign in to update results";
        tone = "err";
      } else if (data?.ok === false) {
        msg = "Couldn't reach the score sources — try again";
        tone = "err";
      } else if (typeof data?.published === "number") {
        const n = data.published as number;
        msg = n > 0 ? `${n} ${n === 1 ? "match was" : "matches were"} updated` : "No new results to update";
      }
    } catch {
      // Network hiccup — still refresh to show whatever's already published.
      msg = "Couldn't reach server — try again";
      tone = "err";
    }
    setBusy(false);
    startTransition(() => router.refresh());
    setFlash({ msg, tone });
    setTimeout(() => setFlash(null), 4000);
  }

  const label = busy || isPending ? "Updating…" : "Update Latest Results";

  return (
    <div data-update-wrap className="relative ml-auto shrink-0">
      <button
        type="button"
        data-update-btn
        onClick={handleClick}
        disabled={busy || isPending}
        aria-label="Update latest results"
        className={cn(
          "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold text-white transition",
          "bg-accent hover:bg-accent/90 disabled:opacity-70"
        )}
      >
        {label}
      </button>
      {flash && (
        // Pops up directly beneath the button, right-aligned to its edge.
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg",
            flash.tone === "err" ? "bg-red-600" : "bg-accent"
          )}
        >
          {flash.msg}
        </div>
      )}
    </div>
  );
}

/** Presentational pill bar. `active` is the currently-selected category, or null. */
export function CategoryPills({ active }: { active: string | null }) {
  const navRef = useRef<HTMLDivElement>(null);

  // Pixel-align the "Update Latest Results" button's right edge with the right
  // edge of the furthest category pill (e.g. "Crazy Predictions" at the end of
  // the first row). The wrap point shifts with viewport width, so we measure and
  // pull the button in with a right margin, re-measuring on resize. ml-auto in
  // the className keeps it right-aligned before/while this runs.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const btn = nav.querySelector<HTMLElement>("[data-update-wrap]");
    if (!btn) return;

    const align = () => {
      const navRight = nav.getBoundingClientRect().right;
      let maxPillRight = 0;
      nav.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
        maxPillRight = Math.max(maxPillRight, a.getBoundingClientRect().right);
      });
      // Distance from the nav's right edge back to the furthest pill's edge.
      btn.style.marginRight = `${Math.max(0, navRight - maxPillRight)}px`;
    };

    align();
    const ro = new ResizeObserver(align);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active]);

  return (
    <div ref={navRef} className="flex flex-wrap items-center gap-2">
      {CATEGORIES.map((c) => (
        <Link
          key={c}
          href={c === "All" ? "/" : TAB_ROUTES[c] ?? `/?category=${encodeURIComponent(c)}`}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition",
            c === active
              ? "bg-accent text-white"
              : "bg-surface-raised text-slate-300 hover:bg-surface-hover"
          )}
        >
          {LABELS[c] ?? c}
        </Link>
      ))}
      {/* Permanent last item; ml-auto pushes it to the far-right of its row so
          the category pills keep their natural order/wrapping. */}
      <UpdateResultsButton />
    </div>
  );
}

/**
 * Permanent category navigation, rendered once in the root layout so it stays
 * visible on every page. Highlights the active pill from the route: a standalone
 * tab (/standings, /scores, …) by pathname, or a home-grid filter by ?category=.
 */
export function CategoryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active =
    ROUTE_TO_TAB[pathname] ??
    (pathname === "/" ? searchParams.get("category") ?? "All" : null);
  return <CategoryPills active={active} />;
}
