import { KICKOFFS } from "@/lib/kickoffs";
import { VENUES, type Venue } from "@/lib/venues";
import { GROUPS, groupOf } from "@/lib/groups";
import { normalize, type Scorer } from "@/lib/results";
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
  number?: number | null; // optional: a few players have no jersey number
  name: string;
  age?: number | null;
  position: Position;
  club?: string | null; // optional: ~14% of players have no club source
  // Rich detail (optional) — populated by scripts/gen-countries.ts from ESPN
  // (bio) + TheSportsDB (club / photo). Absent for hand-curated entries that
  // weren't matched, and the player page degrades gracefully.
  espnId?: string;
  fullName?: string;
  dob?: string; // ISO date, e.g. "1992-06-15"
  nationality?: string;
  height?: string; // ESPN displayHeight, e.g. "5' 9\""
  weight?: string; // ESPN displayWeight, e.g. "159 lbs"
  birthPlace?: string;
  espnUrl?: string; // ESPN profile (full career stats live here)
  photo?: string; // TheSportsDB cutout/thumbnail
  detailedPosition?: string; // TheSportsDB position, e.g. "Right Winger"
}

/** Stable URL slug for a player within their country (unique even on dup names). */
export interface SluggedPlayer extends CountryPlayer {
  slug: string;
}

/** Assign each roster player a unique slug (name-based; jersey suffix on clash). */
export function withPlayerSlugs(roster: CountryPlayer[]): SluggedPlayer[] {
  const base = roster.map((p) => slugifyCountry(p.name) || "player");
  const counts: Record<string, number> = {};
  for (const b of base) counts[b] = (counts[b] ?? 0) + 1;
  return roster.map((p, i) => {
    const b = base[i];
    const slug = counts[b] > 1 ? `${b}-${p.number ?? i}` : b;
    return { ...p, slug };
  });
}

/** Resolve a player within a roster by their URL slug. */
export function findPlayerBySlug(roster: CountryPlayer[], slug: string): SluggedPlayer | null {
  return withPlayerSlugs(roster).find((p) => p.slug === slug) ?? null;
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

/** Graft generated rich fields (dob/photo/espnId/…) onto a curated roster,
 *  matched by normalized name. Curated values win; the generated entry only
 *  fills fields the curated one lacks (so Brazil keeps its sourced clubs). */
function enrichRoster(curated: CountryPlayer[], generated: CountryPlayer[]): CountryPlayer[] {
  if (!generated.length) return curated;
  const byName = new Map(generated.map((g) => [normalize(g.name), g]));
  return curated.map((p) => {
    const g = byName.get(normalize(p.name));
    return g ? { ...g, ...p, club: p.club ?? g.club } : p;
  });
}

/** Assemble everything the country detail page needs. Brazil keeps its richer
 *  curated data (sourced clubs, coach, full sources); others come from ESPN. */
export function getCountry(name: string): CountryData | null {
  if (!ALL_COUNTRIES.includes(name)) return null;
  const isBrazil = name === "Brazil";
  return {
    name,
    group: groupOf(name),
    // Brazil: curated roster enriched with generated bio/photo where names match.
    roster: isBrazil
      ? enrichRoster(BRAZIL_ROSTER, COUNTRY_ROSTERS["Brazil"] ?? [])
      : COUNTRY_ROSTERS[name] ?? [],
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

/** Live WC2026 assists per roster player, resolved by name. Only assists on the
 *  country's OWN goals count (so a same-named opponent isn't credited). */
export function assistsForRoster(
  roster: CountryPlayer[],
  played: { scorers: { team: string; assists?: string[] }[] }[],
  country: string
): Record<string, number> {
  const byNorm: Record<string, number> = {};
  for (const m of played) {
    for (const s of m.scorers) {
      if (normalize(s.team) !== normalize(country)) continue;
      for (const a of s.assists ?? []) byNorm[normalize(a)] = (byNorm[normalize(a)] ?? 0) + 1;
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
  /** Goalscorers for the fixture (both sides); split by `team` in the UI. */
  scorers: Scorer[];
}

/**
 * Map a country's fixtures → final results (keyed by opponent name) for the
 * games that have an approved score. A fixture with no played result is absent,
 * i.e. still upcoming. Score is oriented so `countryGoals` is always the viewed
 * country's tally regardless of home/away. Goalscorers are carried through
 * unchanged (each `Scorer.team` tells the UI which side to place it on).
 */
export function resultsForCountry(
  matches: CountryMatch[],
  played: { home: string; away: string; homeGoals: number; awayGoals: number; scorers: Scorer[] }[],
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
    out[m.opponent] = {
      countryGoals: cg,
      oppGoals: og,
      outcome: cg > og ? "W" : cg < og ? "L" : "D",
      scorers: pm.scorers ?? [],
    };
  }
  return out;
}
