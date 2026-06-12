import { flag } from "@/lib/flags";
import { GROUPS } from "@/lib/groups";
import { getPlayedMatches } from "@/lib/playedMatches";
import { STANDINGS_SOURCES } from "@/lib/sources";
import { SourceNote } from "@/components/SourceNote";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Row {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
}
const pts = (r: Row) => r.w * 3 + r.d;
const gd = (r: Row) => r.gf - r.ga;

export default async function StandingsPage() {
  const played = await getPlayedMatches();

  // Seed every group's four teams at zeroes, then fold in each played result.
  const rows: Record<string, Row> = {};
  for (const teams of Object.values(GROUPS)) {
    for (const t of teams) rows[t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  }
  for (const m of played) {
    const h = rows[m.home];
    const a = rows[m.away];
    if (!h || !a) continue; // not a group-stage pair we track
    h.p++; a.p++;
    h.gf += m.homeGoals; h.ga += m.awayGoals;
    a.gf += m.awayGoals; a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.w++; a.l++; }
    else if (m.homeGoals < m.awayGoals) { a.w++; h.l++; }
    else { h.d++; a.d++; }
  }

  const rank = (a: Row, b: Row) =>
    pts(b) - pts(a) || gd(b) - gd(a) || b.gf - a.gf || a.team.localeCompare(b.team);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Group Standings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          All 12 groups and their points. Tables update as match results are approved
          (3 pts for a win, 1 for a draw). The top two of each group advance to the
          knockout stage. Ordered by points, then goal difference, then goals for.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(GROUPS).map(([letter, teams]) => {
          const table = teams.map((t) => rows[t]).sort(rank);
          return (
            <div key={letter} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-amber-600">
                Group {letter}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-1 text-left font-semibold">Team</th>
                    <th className="px-1 text-center font-semibold" title="Played">P</th>
                    <th className="px-1 text-center font-semibold" title="Won">W</th>
                    <th className="px-1 text-center font-semibold" title="Drawn">D</th>
                    <th className="px-1 text-center font-semibold" title="Lost">L</th>
                    <th className="px-1 text-center font-semibold" title="Goal difference">GD</th>
                    <th className="px-1 text-center font-semibold" title="Points">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r, i) => (
                    <tr
                      key={r.team}
                      className={cn(
                        "border-t border-surface-border",
                        i < 2 && "bg-emerald-500/5"
                      )}
                    >
                      <td className="flex items-center gap-1.5 py-1.5 font-semibold">
                        <span className="w-4 text-right text-xs text-slate-400">{i + 1}</span>
                        <span>{flag(r.team)}</span>
                        <span className="truncate">{r.team}</span>
                      </td>
                      <td className="px-1 text-center text-slate-300">{r.p}</td>
                      <td className="px-1 text-center text-slate-300">{r.w}</td>
                      <td className="px-1 text-center text-slate-300">{r.d}</td>
                      <td className="px-1 text-center text-slate-300">{r.l}</td>
                      <td className="px-1 text-center text-slate-300">
                        {gd(r) > 0 ? `+${gd(r)}` : gd(r)}
                      </td>
                      <td className="px-1 text-center font-bold">{pts(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <SourceNote sources={STANDINGS_SOURCES} />
    </div>
  );
}
