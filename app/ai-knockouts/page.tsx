import { db } from "@/lib/db";
import { yesPrice } from "@/lib/amm";
import { canonicalTeam, flag } from "@/lib/flags";
import { getPlayedMatches } from "@/lib/playedMatches";
import { formAdjustedFor, type WinnerChance } from "@/lib/dynamicPrediction";
import { AiKnockoutBracket } from "@/components/AiKnockoutBracket";
import { buildAiBracket } from "@/lib/aiKnockouts";
import { getBracketTeams } from "@/lib/bracketSync";

export const dynamic = "force-dynamic";

export default async function AiKnockoutsPage() {
  const [played, winnerMarkets, teamMap] = await Promise.all([
    getPlayedMatches(),
    db.market.findMany({ where: { category: "Tournament Winner" } }),
    getBracketTeams(),
  ]);

  // Predicted bracket built on the REAL Round-of-32 draw (Elo-favourite advances),
  // so the pairings always match the live tournament.
  const { rounds: aiRounds, champion: aiChampion } = buildAiBracket(teamMap);

  // Each team's live "win the WC" chance (YES price), team canonicalized to
  // match results/flags (e.g. USA → United States).
  const chances: WinnerChance[] = winnerMarkets
    .map((m) => {
      const team = m.question.match(/^Will (.+?) win the 2026 FIFA World Cup\?$/)?.[1];
      return team ? { team: canonicalTeam(team), pct: yesPrice(m) } : null;
    })
    .filter((c): c is WinnerChance => c !== null);

  // BOTH toggle modes describe the SAME champion — the bracket's predicted winner
  // — so the champion box can never contradict the bracket's final. "AI Prediction"
  // shows its live market %, "Performance-adjusted" shows that same team's market %
  // re-weighted by current form.
  const champCanon = canonicalTeam(aiChampion);
  const adj = formAdjustedFor(champCanon, chances, played);
  const aiPick = { team: aiChampion, pct: adj.marketPct };
  const dynamicPick = { team: aiChampion, pct: adj.pct, marketPct: adj.marketPct };

  // Daily snapshot of the predicted champion → flag a day-over-day change as real
  // results reshape the bracket. Read the most recent prior day BEFORE recording.
  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const prior = await db.dailyChampion.findFirst({
    where: { date: { lt: today } },
    orderBy: { date: "desc" },
  });
  await db.dailyChampion.upsert({
    where: { date: today },
    create: { date: today, champion: aiChampion, pct: adj.pct },
    update: { champion: aiChampion, pct: adj.pct },
  });
  const championChange =
    prior && prior.champion !== aiChampion ? { from: prior.champion, to: aiChampion } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">AI Knockouts — Claude&apos;s Predicted Bracket 🏆</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Just for fun: Claude&apos;s own prediction of how the 2026 knockout stage could play out —
          built on the <span className="font-semibold">real Round-of-32 draw</span>, with the favourite
          advancing each round and predicted scorelines, to a predicted champion:{" "}
          <span className="font-bold text-amber-600">{flag(aiChampion)} {aiChampion}</span>. Toggle the
          champion&apos;s odds between its live market price and a{" "}
          <span className="font-semibold">Performance-adjusted</span> view (that same chance re-weighted
          by live form). It&apos;s an AI guess — not official, and not tradeable.
        </p>
      </div>

      {championChange && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          📣 The predicted champion changed from{" "}
          <span className="whitespace-nowrap">{flag(championChange.from)} {championChange.from}</span> to{" "}
          <span className="whitespace-nowrap">{flag(championChange.to)} {championChange.to}</span> today.
        </div>
      )}

      <AiKnockoutBracket bracket={aiRounds} ai={aiPick} dynamic={dynamicPick} />
    </div>
  );
}
