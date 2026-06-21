import { db } from "@/lib/db";
import { yesPrice } from "@/lib/amm";
import { getPlayedMatches } from "@/lib/playedMatches";
import { computeDynamic } from "@/lib/dynamicPrediction";
import { AiKnockoutBracket } from "@/components/AiKnockoutBracket";
import { AI_CHAMPION } from "@/lib/aiKnockouts";

export const dynamic = "force-dynamic";

export default async function AiKnockoutsPage() {
  const [played, brazilMarket] = await Promise.all([
    getPlayedMatches(),
    db.market.findFirst({
      where: { category: "Tournament Winner", question: { startsWith: "Will Brazil win" } },
    }),
  ]);

  // Brazil Prediction = the live market chance for "Will Brazil win the WC?".
  const brazilPick = { team: "Brazil", pct: brazilMarket ? yesPrice(brazilMarket) : null };
  // Dynamic Prediction = highest form+Elo chance across all teams.
  const dyn = computeDynamic(played);
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
