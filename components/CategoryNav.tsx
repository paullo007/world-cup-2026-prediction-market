"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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

/** Presentational pill bar. `active` is the currently-selected category, or null. */
export function CategoryPills({ active }: { active: string | null }) {
  return (
    <div className="flex flex-wrap gap-2">
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
