import { flag } from "@/lib/flags";
import type { CountryData, MatchResult } from "@/lib/countries";
import { slugifyCountry } from "@/lib/countries";
import type { KnockoutMatchView } from "@/lib/countryKnockouts";
import { SourceNote } from "@/components/SourceNote";
import { SquadTable } from "@/components/SquadTable";
import { CountryGoalsByPlayer } from "@/components/CountryGoalsByPlayer";
import { FixtureCard } from "@/components/FixtureCard";
import type { ScorerRow } from "@/components/GoalscorersTable";

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
 * server-side and passed in keyed by player name. Knockout rounds the team has
 * reached are shown as their own sections after the group stage.
 */
export function CountryDetail({
  data,
  goals,
  assists = {},
  results = {},
  knockouts = [],
  scorerRows = [],
  playedKeys = [],
}: {
  data: CountryData;
  goals: Record<string, number>;
  assists?: Record<string, number>;
  results?: Record<string, MatchResult>;
  knockouts?: KnockoutMatchView[];
  /** Every player who scored for this country (all games), GOALS-tab format. */
  scorerRows?: ScorerRow[];
  /** "home vs away" keys (both orientations) of already-resolved matches — lets
   *  the live overlays (goal panel, squad table) dedupe against confirmed results. */
  playedKeys?: string[];
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

      {/* "ALL GOALS BY PLAYER" — collapsible bar listing every scorer for this
          country (group + knockouts) in the GOALS-tab drill-down format. */}
      <CountryGoalsByPlayer scorers={scorerRows} team={name} playedKeys={playedKeys} />

      {/* 1) Knockout rounds reached — most recent round first (Final → R32), shown
          ABOVE the group stage since those matches are the latest. */}
      {knockouts.map((k) => (
        <Box key={k.round} title={k.title}>
          <div className="grid gap-3 sm:grid-cols-3">
            <FixtureCard
              country={name}
              opponent={k.opponent}
              kickoffIso={k.kickoffIso}
              venue={k.venue}
              result={k.result}
            />
          </div>
        </Box>
      ))}

      {/* 2) Group-stage matches — at the bottom (oldest / completed) */}
      <Box title="Group Stage Matches">
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">No group-stage fixtures found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {matches.map((m) => (
              <FixtureCard
                key={m.opponent}
                country={name}
                opponent={m.opponent}
                kickoffIso={m.kickoffIso}
                venue={m.venue}
                result={results[m.opponent]}
              />
            ))}
          </div>
        )}
      </Box>

      {/* 2) Squad table */}
      <Box title="Squad — 2026 World Cup">
        <SquadTable
          roster={roster}
          goals={goals}
          assists={assists}
          countrySlug={countrySlug}
          team={name}
          playedKeys={playedKeys}
        />
        <p className="mt-3 text-xs italic text-slate-400">
          Click any player for their full profile. Name, age, number and position from ESPN; club
          from TheSportsDB where available. Goals and assists update live from approved 2026 match
          results.
        </p>
      </Box>

      {/* 3) Coach — always shown for layout consistency; a graceful placeholder
          where our data feed doesn't carry a confirmed name (most non-Brazil teams). */}
      <Box title="Head Coach">
        {coach ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl">{flag(coach.country)}</span>
            <div>
              <p className="font-semibold">{coach.name}</p>
              <p className="text-sm text-slate-400">From {coach.country}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm italic text-slate-400">Not in our data feed.</p>
        )}
      </Box>

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
