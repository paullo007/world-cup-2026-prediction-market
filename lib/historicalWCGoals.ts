import { TOP_SCORERS } from "@/lib/topScorers";

/**
 * Prior (pre-2026) FIFA World Cup goals for notable players — hand-curated.
 *
 * Career/historical World Cup goals are NOT exposed by our free data feeds
 * (ESPN / TheSportsDB), so this is a deliberately PARTIAL, manually maintained
 * list; figures are each player's total through the 2022 tournament. Players
 * not listed simply show no historical line on the Goals-tab drill-down (most
 * 2026 scorers are World Cup debutants anyway). Extend as needed.
 *
 * The all-time greats reuse `TOP_SCORERS` (whose `goals` field is precisely the
 * through-2022 total); a small extra map below covers current stars who aren't
 * in that top-10.
 */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

const EXTRA_PRIOR_WC: Record<string, number> = {
  "Neymar": 8,
  "Cristiano Ronaldo": 8,
  "Romelu Lukaku": 5,
  "Cody Gakpo": 3,
  "Richarlison": 3,
  "Bukayo Saka": 3,
  "Vinícius Júnior": 1,
};

/**
 * Prior-World-Cup goal total for a player, or null if we have no curated figure.
 * The all-time top-10 resolve via their `TOP_SCORERS` base (= through-2022).
 */
export function priorWorldCupGoals(name: string): number | null {
  const n = norm(name);
  const ts = TOP_SCORERS.find((t) => norm(t.name) === n);
  if (ts) return ts.goals;
  for (const [k, v] of Object.entries(EXTRA_PRIOR_WC)) if (norm(k) === n) return v;
  return null;
}
