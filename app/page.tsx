import Link from "next/link";
import { db } from "@/lib/db";
import { MarketCard } from "@/components/MarketCard";
import { awaitingResult, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CATEGORIES = ["All", "Tournament Winner", "Matches", "Bracket", "Standings", "Scores", "Goals", "Knockouts", "Crazy Predictions", "Results"];

// Pills that navigate to a standalone tab page rather than filtering the home grid.
const TAB_ROUTES: Record<string, string> = {
  Bracket: "/bracket",
  Standings: "/standings",
  Scores: "/scores",
  Goals: "/goals",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category ?? "All";
  const isResults = category === "Results";

  // Resolved markets live in the "Results" tab; everywhere else only show
  // not-yet-resolved markets (open + closed-awaiting).
  const markets = await db.market.findMany({
    where: isResults
      ? { status: "RESOLVED" }
      : category === "All"
        ? { status: { not: "RESOLVED" } }
        : { category, status: { not: "RESOLVED" } },
    orderBy: isResults ? [{ resolvedAt: "desc" }] : [{ closesAt: "asc" }],
  });

  // Within a non-Results view, push closed-awaiting markets below tradable ones
  // (stable sort keeps the closesAt ordering within each group).
  if (!isResults) {
    markets.sort((a, b) => Number(awaitingResult(a)) - Number(awaitingResult(b)));
  }

  const volumes = await db.trade.groupBy({
    by: ["marketId"],
    _sum: { amount: true },
  });
  const volumeByMarket = new Map(volumes.map((v) => [v.marketId, v._sum.amount ?? 0]));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-raised to-surface p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
          FIFA World Cup · June 11 – July 19, 2026
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          Predict the World Cup. <span className="text-accent">Trade the Odds.</span>
        </h1>
        <p className="mt-3 text-sm font-semibold text-slate-400">WC$ = World Cup Dollar</p>
        <p className="mt-1 max-w-2xl text-slate-300">
          Buy YES or NO shares on real tournament outcomes with WC$. Prices move with the
          crowd — every share of the winning outcome pays 1.00 WC$. New accounts start with
          1,000 WC$.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={c === "All" ? "/" : TAB_ROUTES[c] ?? `/?category=${encodeURIComponent(c)}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              c === category
                ? "bg-accent text-white"
                : "bg-surface-raised text-slate-300 hover:bg-surface-hover"
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {markets.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No markets in this category yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m, i) => (
            <MarketCard
              key={m.id}
              market={m}
              volume={volumeByMarket.get(m.id) ?? 0}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
