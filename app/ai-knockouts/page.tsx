import { db } from "@/lib/db";
import { yesPrice } from "@/lib/amm";
import { canonicalTeam } from "@/lib/flags";
import { getPlayedMatches } from "@/lib/playedMatches";
import { computeDynamic, type WinnerChance } from "@/lib/dynamicPrediction";
import { AiKnockoutBracket } from "@/components/AiKnockoutBracket";
import { AI_CHAMPION } from "@/lib/aiKnockouts";

export const dynamic = "force-dynamic";

export default async function AiKnockoutsPage() {
  const [played, winnerMarkets] = await Promise.all([
    getPlayedMatches(),
    db.market.findMany({ where: { category: "Tournament Winner" } }),
  ]);

  // Each team's live "win the WC" chance (YES price), team canonicalized to
  // match results/flags (e.g. USA → United States).
  const chances: WinnerChance[] = winnerMarkets
    .map((m) => {
      const team = m.question.match(/^Will (.+?) win the 2026 FIFA World Cup\?$/)?.[1];
      return team ? { team: canonicalTeam(team), pct: yesPrice(m) } : null;
    })
    .filter((c): c is WinnerChance => c !== null);

  // Brazil Prediction = Brazil's live market chance. Dynamic = highest
  // form-adjusted market chance (same scale, so 38% correctly beats 16%).
  const brazilPick = { team: "Brazil", pct: chances.find((c) => c.team === "Brazil")?.pct ?? null };
  const dyn = computeDynamic(chances, played);
  const dynamicPick = { team: dyn.champion, pct: dyn.pct };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">AI Knockouts — Claude&apos;s Predicted Bracket 🏆</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Just for fun: Claude&apos;s own prediction of how the 2026 knockout stage could play out —
          from the Round of 32 to the Final, with predicted scorelines. Winners advance across each
          round to a predicted champion:{" "}
          <span className="font-bold text-amber-600">{AI_CHAMPION}</span>. Toggle the champion to a{" "}
          <span className="font-semibold">Dynamic Prediction</span> driven by live form. It&apos;s an
          AI guess — not official, and not tradeable.
        </p>
      </div>

      <AiKnockoutBracket brazil={brazilPick} dynamic={dynamicPick} />
    </div>
  );
}
