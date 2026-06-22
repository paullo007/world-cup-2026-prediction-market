import { flag } from "@/lib/flags";
import type { CountryData, MatchResult } from "@/lib/countries";
import { slugifyCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { MatchStartTime } from "@/components/MatchStartTime";
import { GoalscorersBlock } from "@/components/GoalscorersBlock";
import { SourceNote } from "@/components/SourceNote";
import { SquadTable } from "@/components/SquadTable";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-raised p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-600">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Shared country detail layout — used by both the dedicated Brazil tab and every
 * /countries/[slug] page, so all 48 teams render identically. Goals are computed
 * server-side and passed in keyed by player name.
 */
export function CountryDetail({
  data,
  goals,
  assists = {},
  results = {},
}: {
  data: CountryData;
  goals: Record<string, number>;
  assists?: Record<string, number>;
  results?: Record<string, MatchResult>;
}) {
  const { name, group, roster, coach, titles, matches, sources } = data;
  const countrySlug = slugifyCountry(name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{flag(name)}</span>
        <div>
          <h1 className="text-2xl font-extrabold">{name}</h1>
          <p className="text-sm text-slate-400">
            {group ? `Group ${group} · ` : ""}2026 FIFA World Cup — fixtures, squad, coach and history.
          </p>
        </div>
      </div>

      {/* 1) Group-stage matches */}
      <Box title="Group Stage Matches">
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">No group-stage fixtures found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {matches.map((m) => {
              const r = results[m.opponent];
              const done = Boolean(r);
              return (
                <div
                  key={m.opponent}
                  className={cn(
                    "relative rounded-xl bg-surface p-3",
                    // Upcoming (not yet played): bold green edge. Completed: normal border.
                    done ? "border border-surface-border" : "border-2 border-yes"
                  )}
                >
                  {done && (
                    <span className="absolute right-3 top-3 text-[11px] font-bold text-red-600">
                      COMPLETED
                    </span>
                  )}
                  <div className="flex items-center gap-2 pr-20 font-semibold">
                    <span>{flag(name)}</span> {name}
                    <span className="mx-1 text-xs text-slate-400">vs</span>
                    <span>{flag(m.opponent)}</span> {m.opponent}
                  </div>
                  {r && (
                    <div className="mt-1.5 text-sm font-bold">
                      FT {r.countryGoals} – {r.oppGoals}{" "}
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          r.outcome === "W"
                            ? "text-emerald-600"
                            : r.outcome === "L"
                              ? "text-red-600"
                              : "text-slate-400"
                        )}
                      >
                        · {r.outcome === "W" ? "Won" : r.outcome === "L" ? "Lost" : "Draw"}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 space-y-0.5 text-[11px] leading-tight text-slate-400">
                    <div><MatchStartTime iso={m.kickoffIso} /></div>
                    {m.venue && <div>{m.venue.stadium}, {m.venue.city}, {m.venue.country}</div>}
                  </div>
                  {r && (
                    <div className="mt-2">
                      <GoalscorersBlock
                        scorers={r.scorers}
                        leftTeam={name}
                        rightTeam={m.opponent}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Box>

      {/* 2) Squad table */}
      <Box title="Squad — 2026 World Cup">
        <SquadTable roster={roster} goals={goals} assists={assists} countrySlug={countrySlug} />
        <p className="mt-3 text-xs italic text-slate-400">
          Click any player for their full profile. Name, age, number and position from ESPN; club
          from TheSportsDB where available. Goals and assists update live from approved 2026 match
          results; caps aren&apos;t tracked by our data feed (shown as —).
        </p>
      </Box>

      {/* 3) Coach (only where we have a confirmed name) */}
      {coach && (
        <Box title="Head Coach">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{flag(coach.country)}</span>
            <div>
              <p className="font-semibold">{coach.name}</p>
              <p className="text-sm text-slate-400">From {coach.country}</p>
            </div>
          </div>
        </Box>
      )}

      {/* 4) World Cup titles */}
      <Box title={`World Cup Titles — ${titles.length}${name === "Brazil" ? " (most of any nation)" : ""}`}>
        {titles.length === 0 ? (
          <p className="text-sm text-slate-400">No World Cup titles yet.</p>
        ) : (
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
              {titles.map((t) => (
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
        )}
      </Box>

      <SourceNote sources={sources} />
    </div>
  );
}
