import type { Market, Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MarketCard } from "@/components/MarketCard";
import { MatchCard3Way } from "@/components/MatchCard3Way";
import { MatchDayBoard, type KnockoutMeta } from "@/components/MatchDayBoard";
import { StickySectionBar } from "@/components/StickySectionBar";
import { PredictMyOwnWinner } from "@/components/PredictMyOwnWinner";
import { auth } from "@/lib/auth";
import { canonicalTeam } from "@/lib/flags";
import { yesPrice } from "@/lib/amm";
import { awaitingResult } from "@/lib/utils";
import { getBracketTeams } from "@/lib/bracketSync";
import { knockoutFixtures, type KnockoutFixture } from "@/lib/bracket";
import { VISIBLE_PROPOSAL, PROPOSAL_CATEGORY } from "@/lib/proposals";

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
  "Canada",
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
  // The legacy "Knockouts" category is retired — bounce old links/bookmarks to
  // the new static AI Knockouts prediction page.
  if (searchParams.category === "Knockouts") redirect("/ai-knockouts");

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
  const baseWhere: Prisma.MarketWhereInput = isResults
    ? { status: "RESOLVED" as const, ...hideSecondary, ...hideKnockouts }
    : isMatches
      ? // Include resolved fixtures so the day picker spans every match-day and
        // past (played) days show their final results, not just upcoming games.
        // KnockoutMatches = the tradeable R32→Final 2-way markets.
        { category: { in: ["Matches", "KnockoutMatches"] } }
      : isAll
        ? // Include every outcome so match fixtures can render as 3-way cards
          // (Home/Draw/Away) here too; they're grouped by matchKey below. Keep
          // COMPLETED knockout/winner/crazy markets visible (badged) instead of
          // vanishing — but exclude the finished group stage so it doesn't flood.
          { ...hideKnockouts, NOT: { category: "Matches", status: "RESOLVED" } }
        : { category, status: { not: "RESOLVED" as const }, ...hideSecondary };
  // Global guard: never surface PENDING/REJECTED user proposals anywhere public —
  // only normal markets (proposalStatus NULL) and APPROVED ones. AND-combined so
  // it can't clash with a branch's own OR (and can't hit the NULL-outcome trap).
  const markets = await db.market.findMany({
    where: { AND: [baseWhere, VISIBLE_PROPOSAL] },
    orderBy: isResults ? [{ resolvedAt: "desc" }] : [{ closesAt: "asc" }],
  });

  // Within a non-Results view, push closed-awaiting markets below tradable ones
  // (stable sort keeps the closesAt ordering within each group).
  if (!isResults) {
    markets.sort((a, b) => Number(awaitingResult(a)) - Number(awaitingResult(b)));
  }

  // On the Predict World Cup Winner tab, apply the explicit team order, and
  // gather the canonical teams that already have a market so the "Predict My
  // Own Winner" dropdown can leave them out (includes any resolved ones).
  const isWinner = category === "Tournament Winner";
  let existingWinnerTeams: string[] = [];
  if (isWinner) {
    markets.sort((a, b) => winnerRank(a.question) - winnerRank(b.question));
    const allWinners = await db.market.findMany({
      where: { category: "Tournament Winner" },
      select: { question: true },
    });
    existingWinnerTeams = allWinners
      .map((m) => m.question.match(/^Will (.+?) win the 2026 FIFA World Cup\?$/)?.[1])
      .filter((t): t is string => Boolean(t))
      .map(canonicalTeam);
  }

  // On the Matches tab, compute the signed-in user's realized result per finished
  // fixture (net P&L across its Home/Draw/Away markets) so each resolved card can
  // show "MY WIN / MY LOSS" in place of the traded volume. Keyed by matchKey.
  const myResultByMatch: Record<string, number> = {};
  if (isMatches) {
    const session = await auth();
    if (session?.user?.id) {
      const myPos = await db.position.findMany({
        where: {
          userId: session.user.id,
          market: { category: { in: ["Matches", "KnockoutMatches"] }, status: "RESOLVED" },
          OR: [{ yesShares: { gt: 0.001 } }, { noShares: { gt: 0.001 } }],
        },
        include: { market: { select: { matchKey: true, resolvedOutcome: true } } },
      });
      for (const p of myPos) {
        const mk = p.market.matchKey;
        if (!mk) continue;
        const payout = p.market.resolvedOutcome === "YES" ? p.yesShares : p.noShares;
        myResultByMatch[mk] = (myResultByMatch[mk] ?? 0) + (payout - Math.max(p.costBasis, 0));
      }
    }
  }

  // Knockout fixtures (display-only) for the Matches day picker — teams from ESPN
  // + any manual bracket overrides — so the picker spans the whole tournament,
  // not just the group stage. These aren't tradeable (they live in the Bracket).
  let knockouts: KnockoutFixture[] = [];
  let koMeta: KnockoutMeta = {};
  if (isMatches) {
    const teamMap = await getBracketTeams();
    const allKo = knockoutFixtures(teamMap);

    // matchKeys that already have real (tradeable) knockout markets — those render
    // as MatchCard3Way; their display-only placeholder card is dropped to avoid a
    // duplicate. Round/venue for the tradeable ones flow through koMeta.
    const koMarketKeys = new Set(
      markets.filter((m) => m.category === "KnockoutMatches" && m.matchKey).map((m) => m.matchKey!)
    );
    for (const f of allKo) {
      if (f.teamA && f.teamB) koMeta[`${f.teamA} vs ${f.teamB}`] = { round: f.round, venue: f.venue };
    }
    knockouts = allKo.filter((f) => {
      const mk = f.teamA && f.teamB ? `${f.teamA} vs ${f.teamB}` : null;
      return !(mk && koMarketKeys.has(mk));
    });
  }

  const volumes = await db.trade.groupBy({
    by: ["marketId"],
    _sum: { amount: true },
  });
  const volumeByMarket = new Map(volumes.map((v) => [v.marketId, v._sum.amount ?? 0]));

  // On the All tab, organize markets into labeled sections, each headed by a
  // full-width bar (same green as the "Bracket by FIFA" button):
  //   1) "{Round} Prediction Bets" — knockout match fixtures (3-way/2-way cards),
  //      by date; the round name is derived from the fixtures present.
  //   2) "World Cup Final Winner Prediction Bets" — winner markets, % high→low.
  //   3) "Crazy Prediction Bets" — the novelty markets.
  type AllCard =
    | { kind: "single"; key: string; market: Market; volume: number }
    | { kind: "fixture"; key: string; home: Market; markets: Market[]; volume: number };
  type AllSection = { title: string; start: number; cards: AllCard[] };

  const sections: AllSection[] = [];
  if (isAll) {
    // Group 3-way/2-way match outcomes back into one fixture each; everything else
    // is a single binary card.
    const fixtures = new Map<string, Market[]>();
    const singles: Market[] = [];
    for (const m of markets) {
      if ((m.category === "Matches" || m.category === "KnockoutMatches") && m.matchKey) {
        const g = fixtures.get(m.matchKey) ?? [];
        g.push(m);
        fixtures.set(m.matchKey, g);
      } else {
        singles.push(m);
      }
    }
    const single = (m: Market): AllCard => ({ kind: "single", key: m.id, market: m, volume: volumeByMarket.get(m.id) ?? 0 });

    // Knockout fixtures, by kickoff date. Round name (for the section title) comes
    // from the live bracket so it tracks the active round (R32 now → R16 later).
    const fixtureCards = Array.from(fixtures.values())
      .map((gms): AllCard => {
        const home = gms.find((x) => x.outcomeType === "HOME") ?? gms[0];
        return { kind: "fixture", key: home.matchKey ?? home.id, home, markets: gms, volume: gms.reduce((s, x) => s + (volumeByMarket.get(x.id) ?? 0), 0) };
      })
      .sort((a, b) => (a.kind === "fixture" && b.kind === "fixture" ? a.home.closesAt.getTime() - b.home.closesAt.getTime() : 0));

    if (fixtureCards.length) {
      const teamMap = await getBracketTeams();
      const roundByKey: Record<string, string> = {};
      for (const f of knockoutFixtures(teamMap)) if (f.teamA && f.teamB) roundByKey[`${f.teamA} vs ${f.teamB}`] = f.round;
      const rounds = Array.from(
        new Set(fixtureCards.map((c) => (c.kind === "fixture" ? roundByKey[c.home.matchKey ?? ""] : undefined)).filter(Boolean))
      );
      const title = rounds.length === 1 ? `${rounds[0]} Prediction Bets` : "Knockout Prediction Bets";
      sections.push({ title, start: 0, cards: fixtureCards });
    }

    // Winner markets, highest implied % first (Brazil/favourites → Canada longshot).
    const winnerCards = singles
      .filter((m) => m.category === "Tournament Winner")
      .sort((a, b) => yesPrice(b) - yesPrice(a))
      .map(single);
    if (winnerCards.length) sections.push({ title: "World Cup Final Winner Prediction Bets", start: 0, cards: winnerCards });

    // Crazy / novelty markets.
    const crazyCards = singles
      .filter((m) => m.category === "Crazy Predictions")
      .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime())
      .map(single);
    if (crazyCards.length) sections.push({ title: "Crazy Prediction Bets", start: 0, cards: crazyCards });

    // Community (user-proposed) markets that an admin has approved live.
    const communityCards = singles
      .filter((m) => m.category === PROPOSAL_CATEGORY)
      .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime())
      .map(single);
    if (communityCards.length) sections.push({ title: "Community Prediction Bets", start: 0, cards: communityCards });

    // Anything else (unexpected categories) goes last so nothing silently vanishes.
    const known = new Set(["Tournament Winner", "Crazy Predictions", PROPOSAL_CATEGORY]);
    const otherCards = singles.filter((m) => !known.has(m.category)).map(single);
    if (otherCards.length) sections.push({ title: "Other Prediction Bets", start: 0, cards: otherCards });

    // Continuous card numbering across the sections (1,2,3…).
    let running = 0;
    for (const sec of sections) {
      sec.start = running;
      running += sec.cards.length;
    }
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
          10,000 WC$.
        </p>
      </section>

      {isWinner && (
        <p className="-mt-2 max-w-3xl text-xs italic text-slate-400">
          These are <span className="font-semibold">crowd-set prices</span> — each team&apos;s % is just
          the live market price for its YES shares, moved by traders. They reflect where the crowd is
          betting, not a team-strength model, so they won&apos;t line up with the{" "}
          <Link href="/rankings" className="text-accent hover:underline">FIFA Rankings</Link> tab.
        </p>
      )}

      {isWinner && <PredictMyOwnWinner existingTeams={existingWinnerTeams} />}

      {isMatches ? (
        <MatchDayBoard
          matches={markets.map((m) => ({ market: m, volume: volumeByMarket.get(m.id) ?? 0 }))}
          myResultByMatch={myResultByMatch}
          knockouts={knockouts}
          koMeta={koMeta}
        />
      ) : isAll ? (
        sections.length === 0 ? (
          <p className="py-12 text-center text-slate-400">No markets in this category yet.</p>
        ) : (
          <div className="space-y-8">
            {sections.map((sec) => (
              <div key={sec.title} className="space-y-4">
                <StickySectionBar title={sec.title} />
                <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sec.cards.map((c, i) =>
                    c.kind === "single" ? (
                      <MarketCard key={c.key} market={c.market} volume={c.volume} index={sec.start + i + 1} />
                    ) : (
                      <MatchCard3Way key={c.key} markets={c.markets} volume={c.volume} index={sec.start + i + 1} />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : markets.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No markets in this category yet.
        </p>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
