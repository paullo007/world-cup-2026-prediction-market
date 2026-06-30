import { ALL_TEAMS } from "@/lib/flags";

// Three independent, free score sources (no API key required for ESPN/365Scores;
// TheSportsDB uses the free key "3"). We query all of them and cross-check; a
// match resolves as soon as ANY one source reports it finished (see mergeForMarket
// / ingest — there is no "both must agree" gate). The /admin/sources page compares
// them side by side. TheSportsDB's free season feed is often stale, so ESPN +
// 365Scores carry the load in practice.
export type Source = "ESPN" | "TheSportsDB" | "365Scores";

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// TheSportsDB: FIFA World Cup league id 4429. The free/test key "3" is fine for
// a hobby app; override via env if you get your own.
const tsdbUrl = () =>
  `https://www.thesportsdb.com/api/v1/json/${process.env.THESPORTSDB_API_KEY || "3"}/eventsseason.php?id=4429&s=2026`;

// External names that differ from our ALL_TEAMS spellings (keys are normalize()'d).
const ALIASES: Record<string, string> = {
  "bosnia herzegovina": "Bosnia and Herzegovina",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "czech republic": "Czechia",
  "korea republic": "South Korea",
  "republic of korea": "South Korea",
  "korea south": "South Korea",
  usa: "United States",
  "united states of america": "United States",
  "ir iran": "Iran",
  "cote divoire": "Ivory Coast",
  "cabo verde": "Cape Verde",
  turkey: "Türkiye",
  "congo dr": "DR Congo",
  curacao: "Curaçao",
};

/** Lowercase, strip diacritics and non-alphanumerics for tolerant name matching. */
export function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// normalized name -> canonical team name
const CANON: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const t of ALL_TEAMS) m[normalize(t)] = t;
  for (const [alias, canonical] of Object.entries(ALIASES)) m[normalize(alias)] = canonical;
  return m;
})();

/** Map an external team name to one of our canonical names, or the raw name if unknown. */
export function canonicalTeam(name: string): string {
  return CANON[normalize(name)] ?? name;
}

/** A single goal, attributed to a player and their (canonical) team. */
export interface Scorer {
  name: string;
  team: string; // canonical team name (for own goals: the team the goal COUNTS for)
  minute?: string; // e.g. "9'"
  penalty?: boolean;
  ownGoal?: boolean; // scored into own net; credited to `team` (the benefiting side)
  assists?: string[]; // assisting player name(s), from ESPN's summary endpoint
}

/** One penalty-shootout kick (in taking order), scored or missed. */
export interface ShootoutKick {
  team: string; // canonical team name
  player: string;
  scored: boolean;
  order: number; // shotNumber (1-based), so the UI can show kicks in sequence
}

export interface FinishedMatch {
  source: Source;
  home: string; // canonical name where recognised
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: "HOME" | "AWAY" | "DRAW";
  date: string; // ISO-ish date from the source
  scorers?: Scorer[]; // goalscorers where the source provides them (ESPN only)
  espnEventId?: string; // ESPN event id, used to fetch assists from the summary endpoint
}

const winnerFromScore = (h: number | null, a: number | null): "HOME" | "AWAY" | "DRAW" =>
  h == null || a == null ? "DRAW" : h > a ? "HOME" : a > h ? "AWAY" : "DRAW";

const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export interface EspnDetail {
  type?: { text?: string };
  clock?: { displayValue?: string };
  period?: { number?: number };
  team?: { id?: string };
  scoringPlay?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  shootout?: boolean;
  athletesInvolved?: Array<{ displayName?: string; fullName?: string }>;
}

/**
 * A scoring play that belongs to the penalty SHOOTOUT, not the match. ESPN logs
 * shootout kicks as scoring plays typed "Penalty" (so they'd pass the goal
 * filter), but they are NOT goals — the tie is level on the pitch. They live in
 * period 5 (1=1st half … 4=ET2, 5=shootout) and/or carry a "shootout" type/flag.
 * Counting them inflates every goalscorer list and the site-wide goals totals.
 */
export function isShootoutPlay(d: EspnDetail): boolean {
  return (
    d.shootout === true ||
    (d.period?.number != null && d.period.number >= 5) ||
    /shoot.?out|penalties/i.test(d.type?.text ?? "")
  );
}

interface EspnScoreboard {
  events?: Array<{
    id?: string;
    date: string;
    status?: { type?: { completed?: boolean } };
    competitions?: Array<{
      competitors?: Array<{
        homeAway: "home" | "away";
        score?: string;
        winner?: boolean;
        team?: { id?: string; displayName?: string; name?: string };
      }>;
      details?: EspnDetail[];
    }>;
  }>;
}

/**
 * Parse ESPN scoring plays (competition.details[]) into goalscorers. Pure — no
 * network — so it can be unit-tested. `teamById` maps an ESPN team id to our
 * canonical name. Rules, learned the hard way:
 *  - A scored penalty is typed "Penalty - Scored" (no "goal") → match
 *    /goal|penalty/, or penalty goals vanish.
 *  - Missed penalties have scoringPlay=false → already excluded.
 *  - Own goals (ownGoal=true) DO count: ESPN sets detail.team.id to the
 *    BENEFITING team, so teamById gives the side the goal counts for; we keep
 *    the own-scorer's name and flag ownGoal so every goal yields exactly one
 *    scorer and the list reconciles with the score.
 */
/**
 * Pick a clean player name from an ESPN athlete. ESPN builds `fullName` as
 * "first last", so a mononym player whose last name is null comes through as
 * e.g. "Trézéguet null". Strip any trailing/standalone "null"/"undefined" token,
 * and fall back to `displayName` (already clean) if that leaves nothing.
 */
export function cleanPlayerName(ath?: { displayName?: string; fullName?: string }): string | undefined {
  const clean = (s?: string) =>
    s?.replace(/\b(null|undefined)\b/gi, "").replace(/\s+/g, " ").trim() || undefined;
  return clean(ath?.fullName) ?? clean(ath?.displayName);
}

export function parseEspnScorers(details: EspnDetail[], teamById: Map<string, string>): Scorer[] {
  const scorers: Scorer[] = [];
  for (const d of details) {
    if (!d.scoringPlay) continue;
    if (isShootoutPlay(d)) continue; // shootout kicks aren't goals — see isShootoutPlay
    if (!/goal|penalty/i.test(d.type?.text ?? "")) continue;
    const player = cleanPlayerName(d.athletesInvolved?.[0]);
    const team = d.team?.id ? teamById.get(d.team.id) : undefined;
    if (!player || !team) continue;
    scorers.push({
      name: player,
      team,
      minute: d.clock?.displayValue,
      penalty: d.penaltyKick || undefined,
      ownGoal: d.ownGoal || undefined,
    });
  }
  return scorers;
}

/**
 * Fetch finished World Cup matches from ESPN's public scoreboard endpoint.
 * ESPN's scoreboard defaults to the current day only, so we sweep today plus the
 * previous `daysBack` days to catch matches that finished earlier — comfortably
 * more than enough headroom for a once-daily cron.
 */
export async function fetchEspn(daysBack = 4): Promise<FinishedMatch[]> {
  const out: FinishedMatch[] = [];
  const seen = new Set<string>();
  let lastError: string | null = null;
  let okDays = 0;

  for (let i = 0; i <= daysBack; i++) {
    const ds = yyyymmdd(new Date(Date.now() - i * 86_400_000));
    const res = await fetch(`${ESPN_URL}?dates=${ds}`, { cache: "no-store" });
    if (!res.ok) {
      lastError = `ESPN ${res.status} ${res.statusText}`;
      continue;
    }
    okDays++;
    const data = (await res.json()) as EspnScoreboard;
    for (const ev of data.events ?? []) {
      if (!ev.status?.type?.completed) continue;
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((c) => c.homeAway === "home");
      const away = comp?.competitors?.find((c) => c.homeAway === "away");
      if (!home?.team || !away?.team) continue;

      const homeName = canonicalTeam(home.team.displayName ?? home.team.name ?? "");
      const awayName = canonicalTeam(away.team.displayName ?? away.team.name ?? "");
      const dedupe = ev.id ?? `${pairKey(homeName, awayName)}|${ev.date}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const homeGoals = home.score != null ? Number(home.score) : null;
      const awayGoals = away.score != null ? Number(away.score) : null;
      const winner =
        home.winner === true
          ? "HOME"
          : away.winner === true
            ? "AWAY"
            : winnerFromScore(homeGoals, awayGoals);

      // Goalscorers from competition.details[] (see parseEspnScorers for the rules).
      const teamById = new Map<string, string>();
      if (home.team?.id) teamById.set(home.team.id, homeName);
      if (away.team?.id) teamById.set(away.team.id, awayName);
      const scorers = parseEspnScorers(comp?.details ?? [], teamById);

      out.push({
        source: "ESPN",
        home: homeName,
        away: awayName,
        homeGoals,
        awayGoals,
        winner,
        date: ev.date,
        scorers: scorers.length ? scorers : undefined,
        espnEventId: ev.id,
      });
    }
  }

  // Only surface an error if every day's request failed.
  if (okDays === 0 && lastError) throw new Error(lastError);
  return out;
}

const ESPN_SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

interface EspnSummary {
  keyEvents?: Array<{
    type?: { text?: string };
    clock?: { displayValue?: string };
    // For a goal: participants[0] is the scorer, the rest are the assist(s).
    participants?: Array<{ athlete?: { displayName?: string } }>;
  }>;
}

/**
 * Fetch goal assists for one match from ESPN's per-match SUMMARY endpoint (the
 * scoreboard feed carries only the scorer). Returns a map keyed by
 * `normalize(scorer)|minute` → assisting player name(s). Best-effort: any error
 * yields an empty map so assist enrichment never blocks resolution.
 */
export async function fetchEspnAssists(eventId: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  try {
    const res = await fetch(`${ESPN_SUMMARY_URL}?event=${eventId}`, { cache: "no-store" });
    if (!res.ok) return out;
    const data = (await res.json()) as EspnSummary;
    for (const e of data.keyEvents ?? []) {
      // Goal types include "Goal", "Goal - Header", "Penalty - Scored", etc.
      if (!/goal|scored/i.test(e.type?.text ?? "")) continue;
      const ppl = e.participants ?? [];
      const scorer = ppl[0]?.athlete?.displayName;
      if (!scorer) continue;
      const assists = ppl
        .slice(1)
        .map((p) => p.athlete?.displayName)
        .filter((n): n is string => Boolean(n));
      if (!assists.length) continue;
      out.set(`${normalize(scorer)}|${e.clock?.displayValue ?? ""}`, assists);
    }
  } catch {
    // ignore — assists are optional enrichment
  }
  return out;
}

/**
 * Fetch the penalty-shootout kicks for one match from ESPN's SUMMARY endpoint,
 * which carries a dedicated `shootout` block (the scoreboard feed mislabels the
 * kicks as 120' "Penalty - Scored" goals). Returns every kick — scored AND missed
 * — in taking order, team names canonicalised. Best-effort: any error or a match
 * that didn't go to penalties yields an empty array.
 */
export async function fetchEspnShootout(eventId: string): Promise<ShootoutKick[]> {
  const out: ShootoutKick[] = [];
  try {
    const res = await fetch(`${ESPN_SUMMARY_URL}?event=${eventId}`, { cache: "no-store" });
    if (!res.ok) return out;
    const data = (await res.json()) as {
      shootout?: Array<{ team?: string; shots?: Array<{ player?: string; shotNumber?: number; didScore?: boolean }> }>;
    };
    for (const t of data.shootout ?? []) {
      const team = canonicalTeam(t.team ?? "");
      for (const s of t.shots ?? []) {
        if (!s.player) continue;
        out.push({ team, player: s.player, scored: s.didScore === true, order: s.shotNumber ?? out.length + 1 });
      }
    }
  } catch {
    // ignore — shootout detail is optional enrichment
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}

/** Return a copy of `scorers` with assists attached from a fetchEspnAssists map. */
export function attachAssists(scorers: Scorer[], assists: Map<string, string[]>): Scorer[] {
  if (!assists.size) return scorers;
  return scorers.map((s) => {
    const a =
      assists.get(`${normalize(s.name)}|${s.minute ?? ""}`) ?? assists.get(`${normalize(s.name)}|`);
    return a && a.length ? { ...s, assists: a } : s;
  });
}

/** Fetch finished World Cup matches from TheSportsDB (free, documented). */
export async function fetchTheSportsDB(): Promise<FinishedMatch[]> {
  const res = await fetch(tsdbUrl(), { cache: "no-store" });
  if (!res.ok) throw new Error(`TheSportsDB responded ${res.status} ${res.statusText}`);

  const data = (await res.json()) as {
    events?: Array<{
      strHomeTeam: string;
      strAwayTeam: string;
      intHomeScore: string | null;
      intAwayScore: string | null;
      strStatus: string | null;
      dateEvent: string;
    }> | null;
  };

  const finished = new Set(["FT", "AET", "PEN", "Match Finished", "Finished"]);
  const out: FinishedMatch[] = [];
  for (const ev of data.events ?? []) {
    if (!ev.strStatus || !finished.has(ev.strStatus)) continue;
    const homeGoals = ev.intHomeScore != null ? Number(ev.intHomeScore) : null;
    const awayGoals = ev.intAwayScore != null ? Number(ev.intAwayScore) : null;
    out.push({
      source: "TheSportsDB",
      home: canonicalTeam(ev.strHomeTeam),
      away: canonicalTeam(ev.strAwayTeam),
      homeGoals,
      awayGoals,
      winner: winnerFromScore(homeGoals, awayGoals),
      date: ev.dateEvent,
    });
  }
  return out;
}

// 365scores public web API (no key). FIFA World Cup competition id = 5930;
// statusGroup === 4 means the match has ended. Scores live on each competitor.
// We pull a small date range (today back `daysBack` days) filtered to the WC
// competition, so the response is just the recent World Cup fixtures.
const SCORES365_URL = "https://webws.365scores.com/web/games/";
const ddmmyyyy = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

interface Scores365Response {
  games?: Array<{
    competitionId?: number;
    statusGroup?: number;
    homeCompetitor?: { name?: string; score?: number };
    awayCompetitor?: { name?: string; score?: number };
    startTime?: string;
  }> | null;
}

export async function fetch365Scores(daysBack = 4): Promise<FinishedMatch[]> {
  const params = new URLSearchParams({
    appTypeId: "5",
    langId: "1",
    timezoneName: "UTC",
    competitions: "5930", // FIFA World Cup
    startDate: ddmmyyyy(new Date(Date.now() - daysBack * 86_400_000)),
    endDate: ddmmyyyy(new Date()),
  });
  const res = await fetch(`${SCORES365_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`365Scores responded ${res.status} ${res.statusText}`);

  const data = (await res.json()) as Scores365Response;
  const out: FinishedMatch[] = [];
  for (const g of data.games ?? []) {
    if (g.competitionId !== 5930) continue; // World Cup only
    if (g.statusGroup !== 4) continue; // 4 = ended
    const h = g.homeCompetitor;
    const a = g.awayCompetitor;
    if (!h?.name || !a?.name) continue;
    const homeGoals = h.score != null ? Math.round(Number(h.score)) : null;
    const awayGoals = a.score != null ? Math.round(Number(a.score)) : null;
    out.push({
      source: "365Scores",
      home: canonicalTeam(h.name),
      away: canonicalTeam(a.name),
      homeGoals,
      awayGoals,
      winner: winnerFromScore(homeGoals, awayGoals),
      date: g.startTime ?? "",
    });
  }
  return out;
}

export interface SourceFetch {
  source: Source;
  matches: FinishedMatch[];
  error?: string;
}

/** Fetch all sources independently; a failure in one never blocks the others. */
export async function fetchAllSources(): Promise<SourceFetch[]> {
  const providers: Array<{ source: Source; fn: () => Promise<FinishedMatch[]> }> = [
    { source: "ESPN", fn: fetchEspn },
    { source: "365Scores", fn: fetch365Scores },
    { source: "TheSportsDB", fn: fetchTheSportsDB },
  ];
  return Promise.all(
    providers.map(async ({ source, fn }) => {
      try {
        return { source, matches: await fn() };
      } catch (err) {
        return { source, matches: [], error: err instanceof Error ? err.message : "fetch failed" };
      }
    })
  );
}

/** Unordered, normalized key for a team pair, e.g. pairKey("Mexico","South Africa"). */
export function pairKey(a: string, b: string): string {
  return [normalize(a), normalize(b)].sort().join("|");
}

/**
 * Given a market's home/away and a finished match from some source, decide the
 * YES/NO outcome for "Will {home} beat {away}?" (YES iff the market's home won).
 */
export function outcomeForMarket(
  marketHome: string,
  m: FinishedMatch
): "YES" | "NO" {
  const homeWon =
    (m.winner === "HOME" && normalize(m.home) === normalize(marketHome)) ||
    (m.winner === "AWAY" && normalize(m.away) === normalize(marketHome));
  return homeWon ? "YES" : "NO";
}

export interface MergedResult {
  outcome: "YES" | "NO"; // best consensus outcome (YES iff the market's home won)
  winner: "HOME" | "AWAY" | "DRAW"; // SCORE-based result, market-oriented (group stage)
  advanceWinner: "HOME" | "AWAY" | "DRAW"; // who ADVANCES (incl. penalties); for knockouts
  agree: boolean; // all sources that had a result agreed
  sources: Source[]; // sources that reported this match
  detail: string; // human-readable, for resultDetail / admin display
  homeGoals: number | null; // goals for the market's HOME team
  awayGoals: number | null; // goals for the market's AWAY team
  scorers: Scorer[]; // goalscorers (from whichever source provides them)
  espnEventId?: string; // ESPN event id of the matched fixture, for assist lookup
}

/**
 * Merge per-source finished matches for one market pair. Returns null if no
 * source has a finished result for this pair.
 */
export function mergeForMarket(
  marketHome: string,
  marketAway: string,
  bySource: SourceFetch[]
): MergedResult | null {
  const key = pairKey(marketHome, marketAway);
  const hits: Array<{ source: Source; outcome: "YES" | "NO"; m: FinishedMatch }> = [];
  for (const sf of bySource) {
    const m = sf.matches.find((x) => pairKey(x.home, x.away) === key);
    if (m) hits.push({ source: sf.source, outcome: outcomeForMarket(marketHome, m), m });
  }
  if (hits.length === 0) return null;

  const outcomes = new Set(hits.map((h) => h.outcome));
  const agree = outcomes.size === 1;
  const detail = hits
    .map((h) => `${h.source}: ${h.m.home} ${h.m.homeGoals ?? "?"}–${h.m.awayGoals ?? "?"} ${h.m.away} (${h.outcome})`)
    .join(" · ");

  // Orient the score to the MARKET's home/away (a source may list them swapped).
  const primary = hits[0].m;
  const homeIsMarketHome = normalize(primary.home) === normalize(marketHome);
  const homeGoals = homeIsMarketHome ? primary.homeGoals : primary.awayGoals;
  const awayGoals = homeIsMarketHome ? primary.awayGoals : primary.homeGoals;
  // Scorers come from whichever hit has them (ESPN); they already carry their team.
  const scorers = hits.find((h) => h.m.scorers?.length)?.m.scorers ?? [];
  // ESPN event id (from the ESPN hit, if any) so ingest can fetch assists.
  const espnEventId = hits.find((h) => h.m.source === "ESPN")?.m.espnEventId;

  const winner: "HOME" | "AWAY" | "DRAW" =
    homeGoals != null && awayGoals != null
      ? homeGoals > awayGoals
        ? "HOME"
        : homeGoals < awayGoals
          ? "AWAY"
          : "DRAW"
      : // No parsed score — fall back to the source's own verdict (which can be a
        // draw), re-oriented to the market's home/away.
        primary.winner === "DRAW"
        ? "DRAW"
        : (primary.winner === "HOME") === homeIsMarketHome
          ? "HOME"
          : "AWAY";

  // Advancement winner (who progresses) for KNOCKOUT markets. A knockout can't
  // truly end in a draw — extra time + penalties decide it — and ESPN flags the
  // advancing team (`competitor.winner`), which fetchEspn carries on `m.winner`.
  // The score-based `winner` above would read a 1–1 shootout as DRAW (correct for
  // a group game, wrong for a knockout), so knockout resolution uses THIS instead.
  // Prefer the ESPN hit's verdict (it has the flag); fall back to the primary.
  const advanceSrc = hits.find((h) => h.m.source === "ESPN")?.m ?? primary;
  const advanceHomeIsMarketHome = normalize(advanceSrc.home) === normalize(marketHome);
  const advanceWinner: "HOME" | "AWAY" | "DRAW" =
    advanceSrc.winner === "DRAW"
      ? "DRAW"
      : (advanceSrc.winner === "HOME") === advanceHomeIsMarketHome
        ? "HOME"
        : "AWAY";

  return {
    outcome: hits[0].outcome,
    winner,
    advanceWinner,
    agree,
    sources: hits.map((h) => h.source),
    detail: agree ? `${detail} ✓ agree` : `⚠ disagree — ${detail}`,
    homeGoals,
    awayGoals,
    scorers,
    espnEventId,
  };
}
