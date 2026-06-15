import { flag } from "@/lib/flags";
import { normalize } from "@/lib/results";
import { getPlayedMatches } from "@/lib/playedMatches";
import {
  BRAZIL_ROSTER,
  BRAZIL_COACH,
  BRAZIL_TITLES,
  BRAZIL_SOURCES,
  getBrazilMatches,
} from "@/lib/brazil";
import { MatchStartTime } from "@/components/MatchStartTime";
import { SourceNote } from "@/components/SourceNote";
import { BrazilSquadTable } from "@/components/BrazilSquadTable";

export const dynamic = "force-dynamic";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-raised p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-600">{title}</h2>
      {children}
    </section>
  );
}

export default async function BrazilPage() {
  // Live goals at WC 2026, from the app's own approved results (scorers tagged
  // to Brazil), keyed by normalized player name.
  const played = await getPlayedMatches();
  const goalsByPlayer = new Map<string, number>();
  for (const m of played) {
    for (const s of m.scorers) {
      if (normalize(s.team) !== normalize("Brazil")) continue;
      const k = normalize(s.name);
      goalsByPlayer.set(k, (goalsByPlayer.get(k) ?? 0) + 1);
    }
  }

  // Resolve live goals to each roster player by exact name, so the (client)
  // squad table doesn't need the DB or the normalize() helper.
  const goals: Record<string, number> = {};
  for (const p of BRAZIL_ROSTER) goals[p.name] = goalsByPlayer.get(normalize(p.name)) ?? 0;

  const matches = getBrazilMatches();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{flag("Brazil")}</span>
        <div>
          <h1 className="text-2xl font-extrabold">Brazil</h1>
          <p className="text-sm text-slate-400">
            Seleção Canarinho at the 2026 FIFA World Cup — fixtures, squad, coach and history.
          </p>
        </div>
      </div>

      {/* 1) Group-stage matches */}
      <Box title="Group Stage Matches">
        <div className="grid gap-3 sm:grid-cols-3">
          {matches.map((m) => (
            <div key={m.opponent} className="rounded-xl border border-surface-border bg-surface p-3">
              <div className="flex items-center gap-2 font-semibold">
                <span>{flag("Brazil")}</span> Brazil
                <span className="mx-1 text-xs text-slate-400">vs</span>
                <span>{flag(m.opponent)}</span> {m.opponent}
              </div>
              <div className="mt-2 space-y-0.5 text-[11px] leading-tight text-slate-400">
                <div><MatchStartTime iso={m.kickoffIso} /></div>
                {m.venue && <div>{m.venue.stadium}, {m.venue.city}, {m.venue.country}</div>}
              </div>
            </div>
          ))}
        </div>
      </Box>

      {/* 2) Squad table */}
      <Box title="Squad — 2026 World Cup">
        <BrazilSquadTable goals={goals} />
        <p className="mt-3 text-xs italic text-slate-400">
          Name, age and position from ESPN&apos;s official 26-man roster; goals update live from
          approved match results. Club is shown where a source confirms it; caps, assists and
          remaining clubs update match-by-match and are best checked live via the sources below
          (assists aren&apos;t tracked by our data feed).
        </p>
      </Box>

      {/* 3) Coach */}
      <Box title="Head Coach">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{flag(BRAZIL_COACH.country)}</span>
          <div>
            <p className="font-semibold">{BRAZIL_COACH.name}</p>
            <p className="text-sm text-slate-400">From {BRAZIL_COACH.country}</p>
          </div>
        </div>
      </Box>

      {/* 4) World Cup titles */}
      <Box title={`World Cup Titles — ${BRAZIL_TITLES.length} (most of any nation)`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2 text-left font-semibold">Year</th>
              <th className="px-2 py-2 text-left font-semibold">Beat in Final</th>
              <th className="px-2 py-2 text-left font-semibold">Final City</th>
              <th className="px-2 py-2 text-left font-semibold">Host Country</th>
            </tr>
          </thead>
          <tbody>
            {BRAZIL_TITLES.map((t) => (
              <tr key={t.year} className="border-t border-surface-border">
                <td className="px-2 py-2 font-bold">{t.year}</td>
                <td className="px-2 py-2">
                  <span className="mr-1.5">{flag(t.beat.replace(/ \(.*\)/, ""))}</span>
                  {t.beat}
                </td>
                <td className="px-2 py-2 text-slate-300">{t.city}</td>
                <td className="px-2 py-2 text-slate-300">
                  <span className="mr-1.5">{flag(t.host)}</span>
                  {t.host}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <SourceNote sources={BRAZIL_SOURCES} />
    </div>
  );
}
