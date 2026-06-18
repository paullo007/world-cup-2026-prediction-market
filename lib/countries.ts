import { KICKOFFS } from "@/lib/kickoffs";
import { VENUES, type Venue } from "@/lib/venues";
import { GROUPS, groupOf } from "@/lib/groups";
import { normalize } from "@/lib/results";
import type { SourceLink } from "@/lib/sources";
import { COUNTRY_ROSTERS } from "@/lib/countries.generated";
import {
  BRAZIL_ROSTER,
  BRAZIL_COACH,
  BRAZIL_TITLES,
  BRAZIL_SOURCES,
  type WorldCupTitle,
} from "@/lib/brazil";

export type Position = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";

export interface CountryPlayer {
  number: number | null;
  name: string;
  age: number | null;
  position: Position;
  club: string | null;
}

// Historical World Cup wins for the past champions among the 48 WC2026 teams
// (Italy aren't in the 2026 field). "West Germany" titles are listed under
// Germany. Brazil reuses its own curated list.
export const WORLD_CUP_TITLES: Record<string, WorldCupTitle[]> = {
  Brazil: BRAZIL_TITLES,
  Germany: [
    { year: 1954, beat: "Hungary", city: "Bern", host: "Switzerland" },
    { year: 1974, beat: "Netherlands", city: "Munich", host: "West Germany" },
    { year: 1990, beat: "Argentina", city: "Rome", host: "Italy" },
    { year: 2014, beat: "Argentina", city: "Rio de Janeiro", host: "Brazil" },
  ],
  Argentina: [
    { year: 1978, beat: "Netherlands", city: "Buenos Aires", host: "Argentina" },
    { year: 1986, beat: "West Germany", city: "Mexico City", host: "Mexico" },
    { year: 2022, beat: "France (on penalties)", city: "Lusail", host: "Qatar" },
  ],
  France: [
    { year: 1998, beat: "Brazil", city: "Saint-Denis", host: "France" },
    { year: 2018, beat: "Croatia", city: "Moscow", host: "Russia" },
  ],
  Uruguay: [
    { year: 1930, beat: "Argentina", city: "Montevideo", host: "Uruguay" },
    { year: 1950, beat: "Brazil", city: "Rio de Janeiro", host: "Brazil" },
  ],
  England: [{ year: 1966, beat: "West Germany", city: "London", host: "England" }],
  Spain: [{ year: 2010, beat: "Netherlands", city: "Johannesburg", host: "South Africa" }],
};

export interface CountryMatch {
  home: string;
  away: string;
  opponent: string;
  kickoffIso: string;
  venue?: Venue;
}

/** A country's group-stage fixtures, from the app's verified kickoff/venue data. */
export function getCountryMatches(country: string): CountryMatch[] {
  const out: CountryMatch[] = [];
  for (const key of Object.keys(KICKOFFS)) {
    const [home, away] = key.split(" vs ");
    if (home !== country && away !== country) continue;
    out.push({
      home,
      away,
      opponent: home === country ? away : home,
      kickoffIso: KICKOFFS[key],
      venue: VENUES[key],
    });
  }
  return out.sort((a, b) => (a.kickoffIso < b.kickoffIso ? -1 : 1));
}

export const slugifyCountry = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const ALL_COUNTRIES: string[] = Object.values(GROUPS).flat();
const BY_SLUG: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map((c) => [slugifyCountry(c), c])
);
export const countryFromSlug = (slug: string): string | null => BY_SLUG[slug] ?? null;

const GENERIC_SOURCES: SourceLink[] = [
  { label: "FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026" },
  { label: "ESPN", url: "https://www.espn.com/soccer/" },
  { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup" },
];

export interface CountryData {
  name: string;
  group: string | null;
  roster: CountryPlayer[];
  coach: { name: string; country: string } | null;
  titles: WorldCupTitle[];
  matches: CountryMatch[];
  sources: SourceLink[];
}

/** Assemble everything the country detail page needs. Brazil keeps its richer
 *  curated data (sourced clubs, coach, full sources); others come from ESPN. */
export function getCountry(name: string): CountryData | null {
  if (!ALL_COUNTRIES.includes(name)) return null;
  const isBrazil = name === "Brazil";
  return {
    name,
    group: groupOf(name),
    roster: isBrazil ? BRAZIL_ROSTER : COUNTRY_ROSTERS[name] ?? [],
    coach: isBrazil ? BRAZIL_COACH : null,
    titles: WORLD_CUP_TITLES[name] ?? [],
    matches: getCountryMatches(name),
    sources: isBrazil ? BRAZIL_SOURCES : GENERIC_SOURCES,
  };
}

/** Live goals for a roster, resolved to each player by name (server-side). */
export function goalsForRoster(
  roster: CountryPlayer[],
  played: { scorers: { name: string; team: string }[] }[],
  country: string
): Record<string, number> {
  const byNorm: Record<string, number> = {};
  for (const m of played) {
    for (const s of m.scorers) {
      if (normalize(s.team) !== normalize(country)) continue;
      byNorm[normalize(s.name)] = (byNorm[normalize(s.name)] ?? 0) + 1;
    }
  }
  const out: Record<string, number> = {};
  for (const p of roster) out[p.name] = byNorm[normalize(p.name)] ?? 0;
  return out;
}

/** Final score of a played fixture, oriented to the viewed country. */
export interface MatchResult {
  countryGoals: number;
  oppGoals: number;
  outcome: "W" | "L" | "D";
}

/**
 * Map a country's fixtures → final results (keyed by opponent name) for the
 * games that have an approved score. A fixture with no played result is absent,
 * i.e. still upcoming. Score is oriented so `countryGoals` is always the viewed
 * country's tally regardless of home/away.
 */
export function resultsForCountry(
  matches: CountryMatch[],
  played: { home: string; away: string; homeGoals: number; awayGoals: number }[],
  country: string
): Record<string, MatchResult> {
  const out: Record<string, MatchResult> = {};
  for (const m of matches) {
    const pm = played.find((p) => {
      const a = normalize(p.home);
      const b = normalize(p.away);
      const c = normalize(country);
      const o = normalize(m.opponent);
      return (a === c && b === o) || (b === c && a === o);
    });
    if (!pm) continue;
    const home = normalize(pm.home) === normalize(country);
    const cg = home ? pm.homeGoals : pm.awayGoals;
    const og = home ? pm.awayGoals : pm.homeGoals;
    out[m.opponent] = { countryGoals: cg, oppGoals: og, outcome: cg > og ? "W" : cg < og ? "L" : "D" };
  }
  return out;
}
