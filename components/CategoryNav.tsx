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
  "Knockouts",
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
 * Permanent "Update Latest Results" pill. Refreshes the current page's server
 * data (router.refresh re-runs the server components → re-queries the DB) so any
 * viewer sees the latest admin-approved results without a reload. Read-only: it
 * shows fresher approved data, it does not fetch sources or resolve anything.
 */
function UpdateResultsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justUpdated, setJustUpdated] = useState(false);
  const wasPending = useRef(false);

  // When a refresh finishes (pending true → false), flash "Updated ✓" briefly.
  useEffect(() => {
    if (wasPending.current && !isPending) {
      setJustUpdated(true);
      const t = setTimeout(() => setJustUpdated(false), 2000);
      wasPending.current = isPending;
      return () => clearTimeout(t);
    }
    wasPending.current = isPending;
  }, [isPending]);

  const label = isPending ? "Updating…" : justUpdated ? "Updated ✓" : "Update Latest Results";

  return (
    <button
      type="button"
      data-update-btn
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-label="Update latest results"
      className={cn(
        "ml-auto shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold text-white transition",
        "bg-accent hover:bg-accent/90 disabled:opacity-70"
      )}
    >
      {label}
    </button>
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
    const btn = nav.querySelector<HTMLButtonElement>("[data-update-btn]");
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
