import {
  canonicalTeam,
  parseEspnScorers,
  fetchEspnAssists,
  attachAssists,
  type EspnDetail,
  type Scorer,
} from "@/lib/results";

// ESPN's public scoreboard (no key). Same source as resolution, but this module
// is DELIBERATELY separate from the payout pipeline: it keeps in-progress
// matches that lib/results/lib/ingest throw away. Nothing here resolves a market
// or pays out — resolution still settles only on completed=true.
const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export type LiveState = "in" | "post"; // "in" = playing, "post" = just finished

export interface LiveMatch {
  matchKey: string; // "Home vs Away" (canonical) — joins to Market.matchKey
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  state: LiveState;
  clock: string; // e.g. "70'"
  detail: string; // e.g. "70'", "HT", "FT"
  scorers: Scorer[]; // live goalscorers (name, team, minute, penalty/OG, assists)
}

interface EspnScoreboard {
  events?: Array<{
    id?: string;
    status?: { displayClock?: string; type?: { state?: string; shortDetail?: string } };
    competitions?: Array<{
      status?: { displayClock?: string; type?: { state?: string; shortDetail?: string } };
      competitors?: Array<{
        homeAway: "home" | "away";
        score?: string;
        team?: { id?: string; displayName?: string; name?: string };
      }>;
      details?: EspnDetail[];
    }>;
  }>;
}

const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/**
 * Live + just-finished match states from ESPN. DISPLAY ONLY. Sweeps today and
 * the previous UTC day, because the Singapore match window (01:00–13:00 SGT)
 * straddles the UTC date boundary (17:00–05:00 UTC). Returns matches in state
 * "in" (playing) or "post" (final but maybe not yet resolved in our DB); skips
 * "pre" (scheduled). Best-effort: any fetch error yields fewer entries, never
 * throws.
 */
export async function fetchLiveScores(): Promise<LiveMatch[]> {
  const out: LiveMatch[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= 1; i++) {
    const ds = yyyymmdd(new Date(Date.now() - i * 86_400_000));
    let data: EspnScoreboard;
    try {
      const res = await fetch(`${ESPN_URL}?dates=${ds}`, { cache: "no-store" });
      if (!res.ok) continue;
      data = (await res.json()) as EspnScoreboard;
    } catch {
      continue;
    }

    for (const ev of data.events ?? []) {
      const comp = ev.competitions?.[0];
      const raw = comp?.status?.type?.state ?? ev.status?.type?.state;
      if (raw !== "in" && raw !== "post") continue; // skip scheduled
      const state = raw as LiveState;

      const home = comp?.competitors?.find((c) => c.homeAway === "home");
      const away = comp?.competitors?.find((c) => c.homeAway === "away");
      if (!home?.team || !away?.team) continue;

      const h = canonicalTeam(home.team.displayName ?? home.team.name ?? "");
      const a = canonicalTeam(away.team.displayName ?? away.team.name ?? "");
      const matchKey = `${h} vs ${a}`;
      if (seen.has(matchKey)) continue; // a match can appear under both day queries
      seen.add(matchKey);

      // Live goalscorers from the scoreboard's scoring plays (same parser as
      // resolution), enriched with assists from the per-match summary endpoint.
      const teamById = new Map<string, string>();
      if (home.team.id) teamById.set(home.team.id, h);
      if (away.team.id) teamById.set(away.team.id, a);
      let scorers = parseEspnScorers(comp?.details ?? [], teamById);
      if (ev.id && scorers.length) {
        scorers = attachAssists(scorers, await fetchEspnAssists(ev.id)); // best-effort
      }

      out.push({
        matchKey,
        home: h,
        away: a,
        homeGoals: Number(home.score ?? 0) || 0,
        awayGoals: Number(away.score ?? 0) || 0,
        state,
        clock: comp?.status?.displayClock ?? ev.status?.displayClock ?? "",
        detail: comp?.status?.type?.shortDetail ?? ev.status?.type?.shortDetail ?? "",
        scorers,
      });
    }
  }
  return out;
}
