import { flag } from "@/lib/flags";
import { getPlayedMatches } from "@/lib/playedMatches";

export const dynamic = "force-dynamic";

interface Tally {
  name: string;
  team: string;
  goals: number;
  penalties: number;
}

export default async function GoalsPage() {
  const played = await getPlayedMatches();

  // One row per player who has scored at least once; players who haven't scored
  // never enter the map, so they're absent by construction.
  const byPlayer = new Map<string, Tally>();
  for (const m of played) {
    for (const s of m.scorers) {
      const key = `${s.name}|${s.team}`;
      const t = byPlayer.get(key) ?? { name: s.name, team: s.team, goals: 0, penalties: 0 };
      t.goals++;
      if (s.penalty) t.penalties++;
      byPlayer.set(key, t);
    }
  }

  const scorers = Array.from(byPlayer.values()).sort(
    (a, b) => b.goals - a.goals || a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Goalscorers</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Every player who has scored at least one goal, most goals first. Compiled
          automatically from approved match results — players yet to score don&apos;t
          appear. Own goals aren&apos;t credited.
        </p>
      </div>

      {scorers.length === 0 ? (
        <p className="py-12 text-center text-slate-400">
          No goals recorded yet — scorers appear here once match results are approved.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 text-left font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">Player</th>
                <th className="px-2 py-2 text-left font-semibold">Team</th>
                <th className="px-4 py-2 text-right font-semibold">Goals</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr key={`${s.name}|${s.team}`} className="border-t border-surface-border">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2 font-semibold">
                    {s.name}
                    {s.penalties > 0 && (
                      <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                        ({s.penalties} pen)
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    <span className="mr-1.5">{flag(s.team)}</span>
                    {s.team}
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
