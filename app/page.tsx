import type { Market } from "@prisma/client";
import { db } from "@/lib/db";
import { MarketCard } from "@/components/MarketCard";
import { MatchCard3Way } from "@/components/MatchCard3Way";
import { MatchDayBoard } from "@/components/MatchDayBoard";
import { awaitingResult } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Explicit display order for the "Predict World Cup Winner" tab. The winner
// markets all close on the same day (Jul 19), so there is no natural sort key —
// pin a deterministic order here. Any team not listed falls to the end.
const WINNER_ORDER = [
  "Brazil",
  "Argentina",
  "Spain",
  "France",
  "England",
  "Portugal",
  "Germany",
  "Netherlands",
  "USA",
  "Mexico",
];
const winnerRank = (question: string) => {
  const team = question.match(/^Will (.+?) win the 2026/)?.[1];
  const i = team ? WINNER_ORDER.indexOf(team) : -1;
  return i === -1 ? WINNER_ORDER.length : i;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category ?? "All";
  const isResults = category === "Results";
  const isMatches = category === "Matches";
  const isAll = category === "All";

  // Outside the Matches tab, a 3-way fixture is represented by its single HOME
  // market (the "Will X beat Y?" card); the Draw/Away outcome markets only show
  // grouped on the Matches tab. The Matches tab itself includes all three.
  // NB: keep HOME *and* NULL-outcome markets (Tournament Winner, Knockouts,
  // Crazy Predictions are all NULL). A `NOT … in [DRAW, AWAY]` filter would
  // silently drop NULL rows (SQL three-valued logic), emptying those tabs.
  const hideSecondary = isMatches
    ? {}
    : { OR: [{ outcomeType: "HOME" as const }, { outcomeType: null }] };

  // Resolved markets live in the "Results" tab; everywhere else only show
  // not-yet-resolved markets (open + closed-awaiting).
  // Legacy per-team "Knockouts" markets are retired — the pill now points to the
  // static "AI Knockouts" prediction page — so keep them out of the grid/Results.
  const hideKnockouts = { category: { not: "Knockouts" as const } };
  const markets = await db.market.findMany({
    where: isResults
      ? { status: "RESOLVED", ...hideSecondary, ...hideKnockouts }
      : isMatches
        ? // Include resolved fixtures so the day picker spans every match-day and
          // past (played) days show their final results, not just upcoming games.
          { category: "Matches" }
        : isAll
          ? // Include every outcome so match fixtures can render as 3-way cards
            // (Home/Draw/Away) here too; they're grouped by matchKey below.
            { status: { not: "RESOLVED" }, ...hideKnockouts }
          : { category, status: { not: "RESOLVED" }, ...hideSecondary },
    orderBy: isResults ? [{ resolvedAt: "desc" }] : [{ closesAt: "asc" }],
  });

  // Within a non-Results view, push closed-awaiting markets below tradable ones
  // (stable sort keeps the closesAt ordering within each group).
  if (!isResults) {
    markets.sort((a, b) => Number(awaitingResult(a)) - Number(awaitingResult(b)));
  }

  // On the Predict World Cup Winner tab, apply the explicit team order.
  if (category === "Tournament Winner") {
    markets.sort((a, b) => winnerRank(a.question) - winnerRank(b.question));
  }

  const volumes = await db.trade.groupBy({
    by: ["marketId"],
    _sum: { amount: true },
  });
  const volumeByMarket = new Map(volumes.map((v) => [v.marketId, v._sum.amount ?? 0]));

  // On the All tab, fold the 3-way match outcomes back into one fixture card each
  // (so Home/Draw/Away all show), and keep non-match markets as binary cards.
  // Both share a sort key so they interleave by kickoff time, tradable first.
  type AllCard =
    | { kind: "single"; key: string; sort: number; market: Market; volume: number }
    | { kind: "fixture"; key: string; sort: number; home: Market; markets: Market[]; volume: number };

  const allCards: AllCard[] = [];
  if (isAll) {
    const fixtures = new Map<string, Market[]>();
    for (const m of markets) {
      if (m.category === "Matches" && m.matchKey) {
        const g = fixtures.get(m.matchKey) ?? [];
        g.push(m);
        fixtures.set(m.matchKey, g);
      } else {
        allCards.push({
          kind: "single",
          key: m.id,
          sort: m.closesAt.getTime(),
          market: m,
          volume: volumeByMarket.get(m.id) ?? 0,
        });
      }
    }
    for (const gms of Array.from(fixtures.values())) {
      const home = gms.find((x) => x.outcomeType === "HOME") ?? gms[0];
      allCards.push({
        kind: "fixture",
        key: home.matchKey ?? home.id,
        sort: home.closesAt.getTime(),
        home,
        markets: gms,
        volume: gms.reduce((sum, x) => sum + (volumeByMarket.get(x.id) ?? 0), 0),
      });
    }
    const awaitingOf = (c: AllCard) => awaitingResult(c.kind === "single" ? c.market : c.home);
    allCards.sort((a, b) => Number(awaitingOf(a)) - Number(awaitingOf(b)) || a.sort - b.sort);
  }

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

      {isMatches ? (
        <MatchDayBoard
          matches={markets.map((m) => ({ market: m, volume: volumeByMarket.get(m.id) ?? 0 }))}
        />
      ) : isAll ? (
        allCards.length === 0 ? (
          <p className="py-12 text-center text-slate-400">No markets in this category yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allCards.map((c, i) =>
              c.kind === "single" ? (
                <MarketCard key={c.key} market={c.market} volume={c.volume} index={i + 1} />
              ) : (
                <MatchCard3Way key={c.key} markets={c.markets} volume={c.volume} index={i + 1} />
              )
            )}
          </div>
        )
      ) : markets.length === 0 ? (
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
