// 2026 World Cup knockout bracket (official, matches 73–104) with FIFA venues
// and UTC kickoff times. Teams fill in as the tournament progresses; until then
// each slot shows its group-position placeholder. Matches within each round are
// ordered top-to-bottom to match the bracket tree so the columns line up.
import type { Venue } from "./venues";

export type Slot = {
  label: string; // "Winner A", "3rd A/B/C/D/F", "Winner 74", …
  team?: string; // filled in via BracketAssignment
};

export type BracketMatch = {
  num: number;
  date: string; // YYYY-MM-DD (nominal match date)
  kickoff: string; // UTC ISO instant
  venue: Venue;
  a: Slot;
  b: Slot;
};

export type BracketRound = {
  key: string;
  name: string;
  dates: string;
  matches: BracketMatch[];
};

const s = (label: string, team?: string): Slot => ({ label, team });
const v = (stadium: string, city: string, country: string): Venue => ({ stadium, city, country });

export const BRACKET: BracketRound[] = [
  {
    key: "r32",
    name: "Round of 32",
    dates: "Jun 28 – Jul 3",
    matches: [
      { num: 74, date: "2026-06-29", kickoff: "2026-06-29T20:30:00Z", venue: v("Boston Stadium", "Boston", "USA"), a: s("Winner E"), b: s("3rd A/B/C/D/F") },
      { num: 77, date: "2026-06-30", kickoff: "2026-06-30T21:00:00Z", venue: v("New York/New Jersey Stadium", "New Jersey", "USA"), a: s("Winner I"), b: s("3rd C/D/F/G/H") },
      { num: 73, date: "2026-06-28", kickoff: "2026-06-28T19:00:00Z", venue: v("Los Angeles Stadium", "Los Angeles", "USA"), a: s("Runner-up A"), b: s("Runner-up B") },
      { num: 75, date: "2026-06-29", kickoff: "2026-06-30T01:00:00Z", venue: v("Monterrey Stadium", "Monterrey", "Mexico"), a: s("Winner F"), b: s("Runner-up C") },
      { num: 83, date: "2026-07-02", kickoff: "2026-07-02T23:00:00Z", venue: v("Toronto Stadium", "Toronto", "Canada"), a: s("Runner-up K"), b: s("Runner-up L") },
      { num: 84, date: "2026-07-02", kickoff: "2026-07-02T19:00:00Z", venue: v("Los Angeles Stadium", "Los Angeles", "USA"), a: s("Winner H"), b: s("Runner-up J") },
      { num: 81, date: "2026-07-01", kickoff: "2026-07-02T00:00:00Z", venue: v("San Francisco Bay Area Stadium", "San Francisco Bay Area", "USA"), a: s("Winner D"), b: s("3rd B/E/F/I/J") },
      { num: 82, date: "2026-07-01", kickoff: "2026-07-01T20:00:00Z", venue: v("Seattle Stadium", "Seattle", "USA"), a: s("Winner G"), b: s("3rd A/E/H/I/J") },
      { num: 76, date: "2026-06-29", kickoff: "2026-06-29T17:00:00Z", venue: v("Houston Stadium", "Houston", "USA"), a: s("Winner C"), b: s("Runner-up F") },
      { num: 78, date: "2026-06-30", kickoff: "2026-06-30T17:00:00Z", venue: v("Dallas Stadium", "Dallas", "USA"), a: s("Runner-up E"), b: s("Runner-up I") },
      { num: 79, date: "2026-06-30", kickoff: "2026-07-01T01:00:00Z", venue: v("Mexico City Stadium", "Mexico City", "Mexico"), a: s("Winner A"), b: s("3rd C/E/F/H/I") },
      { num: 80, date: "2026-07-01", kickoff: "2026-07-01T16:00:00Z", venue: v("Atlanta Stadium", "Atlanta", "USA"), a: s("Winner L"), b: s("3rd E/H/I/J/K") },
      { num: 86, date: "2026-07-03", kickoff: "2026-07-03T22:00:00Z", venue: v("Miami Stadium", "Miami", "USA"), a: s("Winner J"), b: s("Runner-up H") },
      { num: 88, date: "2026-07-03", kickoff: "2026-07-03T18:00:00Z", venue: v("Dallas Stadium", "Dallas", "USA"), a: s("Runner-up D"), b: s("Runner-up G") },
      { num: 85, date: "2026-07-02", kickoff: "2026-07-03T03:00:00Z", venue: v("BC Place Vancouver", "Vancouver", "Canada"), a: s("Winner B"), b: s("3rd E/F/G/I/J") },
      { num: 87, date: "2026-07-03", kickoff: "2026-07-04T01:30:00Z", venue: v("Kansas City Stadium", "Kansas City", "USA"), a: s("Winner K"), b: s("3rd D/E/I/J/L") },
    ],
  },
  {
    key: "r16",
    name: "Round of 16",
    dates: "Jul 4 – Jul 7",
    matches: [
      { num: 89, date: "2026-07-04", kickoff: "2026-07-04T21:00:00Z", venue: v("Philadelphia Stadium", "Philadelphia", "USA"), a: s("Winner 74"), b: s("Winner 77") },
      { num: 90, date: "2026-07-04", kickoff: "2026-07-04T17:00:00Z", venue: v("Houston Stadium", "Houston", "USA"), a: s("Winner 73"), b: s("Winner 75") },
      { num: 93, date: "2026-07-06", kickoff: "2026-07-06T19:00:00Z", venue: v("Dallas Stadium", "Dallas", "USA"), a: s("Winner 83"), b: s("Winner 84") },
      { num: 94, date: "2026-07-06", kickoff: "2026-07-07T00:00:00Z", venue: v("Seattle Stadium", "Seattle", "USA"), a: s("Winner 81"), b: s("Winner 82") },
      { num: 91, date: "2026-07-05", kickoff: "2026-07-05T20:00:00Z", venue: v("New York/New Jersey Stadium", "New Jersey", "USA"), a: s("Winner 76"), b: s("Winner 78") },
      { num: 92, date: "2026-07-05", kickoff: "2026-07-06T00:00:00Z", venue: v("Mexico City Stadium", "Mexico City", "Mexico"), a: s("Winner 79"), b: s("Winner 80") },
      { num: 95, date: "2026-07-07", kickoff: "2026-07-07T16:00:00Z", venue: v("Atlanta Stadium", "Atlanta", "USA"), a: s("Winner 86"), b: s("Winner 88") },
      { num: 96, date: "2026-07-07", kickoff: "2026-07-07T20:00:00Z", venue: v("BC Place Vancouver", "Vancouver", "Canada"), a: s("Winner 85"), b: s("Winner 87") },
    ],
  },
  {
    key: "qf",
    name: "Quarter-finals",
    dates: "Jul 9 – Jul 11",
    matches: [
      { num: 97, date: "2026-07-09", kickoff: "2026-07-09T20:00:00Z", venue: v("Boston Stadium", "Boston", "USA"), a: s("Winner 89"), b: s("Winner 90") },
      { num: 98, date: "2026-07-10", kickoff: "2026-07-10T19:00:00Z", venue: v("Los Angeles Stadium", "Los Angeles", "USA"), a: s("Winner 93"), b: s("Winner 94") },
      { num: 99, date: "2026-07-11", kickoff: "2026-07-11T21:00:00Z", venue: v("Miami Stadium", "Miami", "USA"), a: s("Winner 91"), b: s("Winner 92") },
      { num: 100, date: "2026-07-11", kickoff: "2026-07-12T01:00:00Z", venue: v("Kansas City Stadium", "Kansas City", "USA"), a: s("Winner 95"), b: s("Winner 96") },
    ],
  },
  {
    key: "sf",
    name: "Semi-finals",
    dates: "Jul 14 – Jul 15",
    matches: [
      { num: 101, date: "2026-07-14", kickoff: "2026-07-14T19:00:00Z", venue: v("Dallas Stadium", "Dallas", "USA"), a: s("Winner 97"), b: s("Winner 98") },
      { num: 102, date: "2026-07-15", kickoff: "2026-07-15T19:00:00Z", venue: v("Atlanta Stadium", "Atlanta", "USA"), a: s("Winner 99"), b: s("Winner 100") },
    ],
  },
  {
    key: "final",
    name: "Final",
    dates: "Jul 19",
    matches: [
      { num: 104, date: "2026-07-19", kickoff: "2026-07-19T19:00:00Z", venue: v("New York/New Jersey Stadium", "New Jersey", "USA"), a: s("Winner 101"), b: s("Winner 102") },
    ],
  },
];

// Third-place play-off (shown separately, not part of the main tree).
export const THIRD_PLACE: BracketMatch = {
  num: 103,
  date: "2026-07-18",
  kickoff: "2026-07-18T21:00:00Z",
  venue: v("Miami Stadium", "Miami", "USA"),
  a: s("Loser 101"),
  b: s("Loser 102"),
};

/** A knockout fixture flattened for the Matches-tab day picker (display-only).
 *  Teams come from the bracket assignments / ESPN sync; `labelA`/`labelB` are the
 *  positional placeholders shown until a team is known ("Winner 74"). */
export interface KnockoutFixture {
  num: number;
  round: string; // "Round of 32", …
  date: string; // YYYY-MM-DD
  kickoff: string; // UTC ISO
  venue: Venue;
  labelA: string;
  labelB: string;
  teamA?: string;
  teamB?: string;
}

/** All knockout fixtures (R32 → Final + third-place) with teams filled from the
 *  given slot→team map (`"74a"`/`"74b"`), for showing on the Matches day picker. */
export function knockoutFixtures(teams: Record<string, string>): KnockoutFixture[] {
  const out: KnockoutFixture[] = [];
  const add = (m: BracketMatch, round: string) =>
    out.push({
      num: m.num,
      round,
      date: m.date,
      kickoff: m.kickoff,
      venue: m.venue,
      labelA: m.a.label,
      labelB: m.b.label,
      teamA: teams[`${m.num}a`] ?? m.a.team,
      teamB: teams[`${m.num}b`] ?? m.b.team,
    });
  for (const r of BRACKET) for (const m of r.matches) add(m, r.name);
  add(THIRD_PLACE, "Third-place play-off");
  return out;
}
