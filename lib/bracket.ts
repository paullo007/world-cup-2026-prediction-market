// 2026 World Cup knockout bracket structure (official, matches 73–104).
// Teams fill in once the group stage finishes (Jun 27); until then each slot
// shows its group-position placeholder. Matches within each round are ordered
// top-to-bottom to match the bracket tree so the columns line up visually.

export type Slot = {
  /** Placeholder like "Winner A" or "3rd A/B/C/D/F", or "Winner 74" for later rounds. */
  label: string;
  /** Filled in with a country name as the tournament progresses. */
  team?: string;
};

export type BracketMatch = {
  num: number;
  date: string; // YYYY-MM-DD
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

export const BRACKET: BracketRound[] = [
  {
    key: "r32",
    name: "Round of 32",
    dates: "Jun 28 – Jul 3",
    matches: [
      { num: 74, date: "2026-06-29", a: s("Winner E"), b: s("3rd A/B/C/D/F") },
      { num: 77, date: "2026-06-30", a: s("Winner I"), b: s("3rd C/D/F/G/H") },
      { num: 73, date: "2026-06-28", a: s("Runner-up A"), b: s("Runner-up B") },
      { num: 75, date: "2026-06-29", a: s("Winner F"), b: s("Runner-up C") },
      { num: 83, date: "2026-07-02", a: s("Runner-up K"), b: s("Runner-up L") },
      { num: 84, date: "2026-07-02", a: s("Winner H"), b: s("Runner-up J") },
      { num: 81, date: "2026-07-01", a: s("Winner D"), b: s("3rd B/E/F/I/J") },
      { num: 82, date: "2026-07-01", a: s("Winner G"), b: s("3rd A/E/H/I/J") },
      { num: 76, date: "2026-06-29", a: s("Winner C"), b: s("Runner-up F") },
      { num: 78, date: "2026-06-30", a: s("Runner-up E"), b: s("Runner-up I") },
      { num: 79, date: "2026-06-30", a: s("Winner A"), b: s("3rd C/E/F/H/I") },
      { num: 80, date: "2026-07-01", a: s("Winner L"), b: s("3rd E/H/I/J/K") },
      { num: 86, date: "2026-07-03", a: s("Winner J"), b: s("Runner-up H") },
      { num: 88, date: "2026-07-03", a: s("Runner-up D"), b: s("Runner-up G") },
      { num: 85, date: "2026-07-02", a: s("Winner B"), b: s("3rd E/F/G/I/J") },
      { num: 87, date: "2026-07-03", a: s("Winner K"), b: s("3rd D/E/I/J/L") },
    ],
  },
  {
    key: "r16",
    name: "Round of 16",
    dates: "Jul 4 – Jul 7",
    matches: [
      { num: 89, date: "2026-07-04", a: s("Winner 74"), b: s("Winner 77") },
      { num: 90, date: "2026-07-04", a: s("Winner 73"), b: s("Winner 75") },
      { num: 93, date: "2026-07-06", a: s("Winner 83"), b: s("Winner 84") },
      { num: 94, date: "2026-07-06", a: s("Winner 81"), b: s("Winner 82") },
      { num: 91, date: "2026-07-05", a: s("Winner 76"), b: s("Winner 78") },
      { num: 92, date: "2026-07-05", a: s("Winner 79"), b: s("Winner 80") },
      { num: 95, date: "2026-07-07", a: s("Winner 86"), b: s("Winner 88") },
      { num: 96, date: "2026-07-07", a: s("Winner 85"), b: s("Winner 87") },
    ],
  },
  {
    key: "qf",
    name: "Quarter-finals",
    dates: "Jul 9 – Jul 11",
    matches: [
      { num: 97, date: "2026-07-09", a: s("Winner 89"), b: s("Winner 90") },
      { num: 98, date: "2026-07-10", a: s("Winner 93"), b: s("Winner 94") },
      { num: 99, date: "2026-07-11", a: s("Winner 91"), b: s("Winner 92") },
      { num: 100, date: "2026-07-11", a: s("Winner 95"), b: s("Winner 96") },
    ],
  },
  {
    key: "sf",
    name: "Semi-finals",
    dates: "Jul 14 – Jul 15",
    matches: [
      { num: 101, date: "2026-07-14", a: s("Winner 97"), b: s("Winner 98") },
      { num: 102, date: "2026-07-15", a: s("Winner 99"), b: s("Winner 100") },
    ],
  },
  {
    key: "final",
    name: "Final",
    dates: "Jul 19",
    matches: [{ num: 104, date: "2026-07-19", a: s("Winner 101"), b: s("Winner 102") }],
  },
];

// Third-place play-off (shown separately, not part of the main tree).
export const THIRD_PLACE: BracketMatch = {
  num: 103,
  date: "2026-07-18",
  a: s("Loser 101"),
  b: s("Loser 102"),
};
