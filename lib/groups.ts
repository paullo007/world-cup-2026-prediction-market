// The 12 World Cup 2026 groups (A–L), each 4 teams.
//
// Membership is DERIVED from the verified group-stage fixtures in
// prisma/seed.ts: group-stage matches are strictly within-group, so clustering
// the 72 fixtures by "who played whom" yields exactly 12 disjoint sets of 4.
// That part is not a guess — it falls straight out of the fixtures Paul verified.
//
// The A–L *letters* are ordered by each group's first fixture appearance, which
// lines up with the host seeding (Mexico→A, Canada→B). Pending Paul's final
// confirmation of the lettering; correcting a letter is a one-line change here
// and flows through Standings automatically.
export const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Korea", "Czechia", "South Africa"],
  B: ["Canada", "Bosnia and Herzegovina", "Switzerland", "Qatar"],
  C: ["United States", "Paraguay", "Australia", "Türkiye"],
  D: ["Brazil", "Morocco", "Haiti", "Scotland"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  H: ["Belgium", "Egypt", "Iran", "New Zealand"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export const GROUP_LETTERS = Object.keys(GROUPS);

// team -> group letter, for O(1) lookup when tallying standings.
const TEAM_TO_GROUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [letter, teams] of Object.entries(GROUPS)) {
    for (const t of teams) m[t] = letter;
  }
  return m;
})();

/** The group letter a team is in, or null if it isn't a group-stage team. */
export function groupOf(team: string): string | null {
  return TEAM_TO_GROUP[team] ?? null;
}
