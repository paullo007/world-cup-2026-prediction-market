import { canonicalTeam } from "@/lib/results";
import { ALL_TEAMS } from "@/lib/flags";

// Auto-populate the knockout bracket from ESPN, in real-time. DISPLAY-ONLY —
// this never resolves a market or pays out; it only fills team names into the
// bracket as FIFA/ESPN confirm them. Placeholders ("Third Place Group …",
// "Group I Winner", "Round of 32 1 Winner") are skipped so only real teams show.
const ESPN_KO_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260719";

// Stable ESPN event id -> our bracket match number (lib/bracket.ts `num`).
// R32 is VERIFIED against the live draw (ESPN placeholder labels → our slot
// labels, with venue disambiguating the four fully-resolved ties). R16+ are
// best-effort by round + venue while every team is still TBD — re-verify each
// round's mapping before its teams populate (R16 ~Jul 4, QF ~Jul 9, …).
const EVENT_TO_MATCH: Record<string, number> = {
  // Round of 32 (verified)
  "760486": 73, "760487": 76, "760488": 75, "760489": 74,
  "760490": 78, "760491": 79, "760492": 77, "760493": 82,
  "760494": 81, "760495": 80, "760496": 83, "760497": 84,
  "760498": 85, "760499": 88, "760500": 86, "760501": 87,
  // Round of 16 (verify before Jul 4)
  "760502": 90, "760503": 89, "760504": 91, "760505": 92,
  "760506": 93, "760507": 94, "760508": 96, "760509": 95,
  // Quarter-finals (verify before Jul 9)
  "760510": 97, "760511": 98, "760512": 99, "760513": 100,
  // Semi-finals / third-place / final (verify before the round)
  "760514": 101, "760515": 102, "760516": 103, "760517": 104,
};

const isRealTeam = (name?: string) => !!name && ALL_TEAMS.includes(canonicalTeam(name));

/** Slot key ("74a"/"74b") -> confirmed team name. Matches BracketAssignment.slot. */
export type BracketTeams = Record<string, string>;

interface EspnKo {
  events?: Array<{
    id?: string;
    competitions?: Array<{
      competitors?: Array<{ homeAway: "home" | "away"; team?: { displayName?: string } }>;
    }>;
  }>;
}

/**
 * Pull the current knockout matchups from ESPN and produce slot→team
 * assignments. Each event maps to our match number via the stable id map; the
 * home team fills the `a` slot, away fills `b`. Only confirmed real teams are
 * written (placeholders left for the bracket's positional labels). Best-effort:
 * any fetch error yields an empty map, never throws.
 */
export async function fetchBracketTeams(): Promise<BracketTeams> {
  const out: BracketTeams = {};
  let data: EspnKo;
  try {
    const res = await fetch(ESPN_KO_URL, { cache: "no-store" });
    if (!res.ok) return out;
    data = (await res.json()) as EspnKo;
  } catch {
    return out;
  }

  for (const ev of data.events ?? []) {
    const num = ev.id ? EVENT_TO_MATCH[ev.id] : undefined;
    if (!num) continue;
    const comp = ev.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team?.displayName;
    const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team?.displayName;
    if (isRealTeam(home)) out[`${num}a`] = canonicalTeam(home!);
    if (isRealTeam(away)) out[`${num}b`] = canonicalTeam(away!);
  }
  return out;
}
