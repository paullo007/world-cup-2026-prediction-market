// Generate lib/countries.generated.ts — squad rosters for all 48 WC2026 teams.
// Bio fields come from ESPN (the same source as the curated Brazil tab); club +
// photo are best-effort enrichment from TheSportsDB (free key "3"). TheSportsDB
// lookups are throttled and cached to scripts/.sdb-cache.json so the run is
// resumable and re-runs are cheap. Run when squads change:
//   npx tsx scripts/gen-countries.ts          (full, with enrichment)
//   npx tsx scripts/gen-countries.ts --no-sdb (ESPN bio only, fast)
import { writeFileSync, readFileSync, existsSync } from "fs";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const SDB = "https://www.thesportsdb.com/api/v1/json/3";
const CACHE_FILE = "scripts/.sdb-cache.json";

// ESPN displayName -> our canonical (lib/groups.ts) name. Only the few that differ.
const NAME_FIX: Record<string, string> = {
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Congo DR": "DR Congo",
};

const posBucket = (raw?: string): "Goalkeeper" | "Defender" | "Midfielder" | "Forward" => {
  const s = (raw || "").toLowerCase();
  if (s.includes("goal")) return "Goalkeeper";
  if (s.includes("defend") || s.includes("back")) return "Defender";
  if (s.includes("midfield")) return "Midfielder";
  return "Forward";
};
const ORDER: Record<string, number> = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- TheSportsDB enrichment (cached) --------------------------------------
interface SdbHit {
  club: string | null;
  photo: string | null;
  detailedPosition: string | null;
  nationality: string | null;
  dob: string | null;
}
type Cache = Record<string, SdbHit | null>; // keyed by `${normalizedName}|${country}`
const cache: Cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
let cacheDirty = 0;
const saveCache = () => writeFileSync(CACHE_FILE, JSON.stringify(cache));

/** Look up one player on TheSportsDB. Accept a result only if its name matches
 *  closely or its nationality matches the team country, to avoid common-name
 *  false positives. Returns null when nothing trustworthy is found. */
async function sdbLookup(name: string, country: string): Promise<SdbHit | null> {
  const key = `${normalize(name)}|${normalize(country)}`;
  if (key in cache) return cache[key]; // only genuine responses are ever cached

  const nn = normalize(name);
  const nc = normalize(country);
  // Retry on rate-limit (429) / transient failure with exponential backoff. A
  // failed lookup returns null WITHOUT caching, so a re-run retries it.
  for (let attempt = 0; attempt < 5; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${SDB}/searchplayers.php?p=${encodeURIComponent(name)}`);
    } catch {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1)); // backoff and retry
      continue;
    }
    if (!res.ok) return null; // other client error → give up, don't poison cache
    let j: { player?: any[] };
    try {
      j = (await res.json()) as { player?: any[] };
    } catch {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    const players = j.player ?? [];
    const pick =
      players.find((p) => normalize(p.strPlayer ?? "") === nn && normalize(p.strNationality ?? "") === nc) ??
      players.find((p) => normalize(p.strNationality ?? "") === nc) ??
      players.find((p) => normalize(p.strPlayer ?? "") === nn) ??
      null;
    const hit: SdbHit | null = pick
      ? {
          club: pick.strTeam || null,
          photo: pick.strCutout || pick.strThumb || null,
          detailedPosition: pick.strPosition || null,
          nationality: pick.strNationality || null,
          dob: pick.dateBorn || null,
        }
      : null;
    cache[key] = hit; // genuine result (match or confirmed no-match) → cache it
    if (++cacheDirty % 25 === 0) saveCache();
    return hit;
  }
  return null; // exhausted retries (still rate-limited) → uncached, retry next run
}

async function main() {
  const enrich = !process.argv.includes("--no-sdb");
  const tj = await (await fetch(`${BASE}/teams`)).json();
  const teams: { id: string; name: string }[] = tj.sports[0].leagues[0].teams.map((t: any) => ({
    id: t.team.id,
    name: NAME_FIX[t.team.displayName] ?? t.team.displayName,
  }));

  const out: Record<string, any[]> = {};
  for (const t of teams) {
    const r = await fetch(`${BASE}/teams/${t.id}/roster`);
    if (!r.ok) { console.error("roster FAIL", t.name, r.status); continue; }
    const j = await r.json();

    const players: any[] = [];
    for (const a of j.athletes || []) {
      const links = a.links || [];
      const espnUrl =
        links.find((l: any) => (l.rel || []).includes("playercard"))?.href ||
        links.find((l: any) => (l.rel || []).includes("stats"))?.href ||
        links[0]?.href ||
        null;
      const player: any = {
        number: a.jersey != null && a.jersey !== "" ? Number(a.jersey) : null,
        name: a.displayName as string,
        age: typeof a.age === "number" ? a.age : null,
        position: posBucket(a.position?.name),
        club: null,
        espnId: a.id ? String(a.id) : null,
        fullName: a.fullName || null,
        dob: typeof a.dateOfBirth === "string" ? a.dateOfBirth.slice(0, 10) : null,
        nationality: a.citizenship || null,
        height: a.displayHeight || null,
        weight: a.displayWeight || null,
        birthPlace:
          [a.birthPlace?.city, a.birthPlace?.state, a.birthPlace?.country].filter(Boolean).join(", ") || null,
        espnUrl,
        photo: null,
        detailedPosition: a.position?.displayName || null,
      };

      if (enrich) {
        const s = await sdbLookup(player.name, t.name);
        if (s) {
          player.club = s.club ?? player.club;
          player.photo = s.photo ?? player.photo;
          player.detailedPosition = s.detailedPosition ?? player.detailedPosition;
          player.nationality = player.nationality ?? s.nationality;
          player.dob = player.dob ?? s.dob;
        }
        await sleep(700); // stay under the free TheSportsDB rate limit
      }
      players.push(player);
    }

    players.sort(
      (x, y) => ORDER[x.position] - ORDER[y.position] || (x.number ?? 99) - (y.number ?? 99)
    );
    // Drop null-valued OPTIONAL keys to keep the file compact, but always keep
    // the core required fields (so the generated data stays type-valid).
    const CORE = new Set(["number", "name", "age", "position"]);
    out[t.name] = players.map((p) =>
      Object.fromEntries(Object.entries(p).filter(([k, v]) => CORE.has(k) || v != null))
    );
    console.error("ok", t.name, players.length, enrich ? `(${players.filter((p) => p.club).length} clubs)` : "");
  }
  saveCache();

  const body =
    `// AUTO-GENERATED by scripts/gen-countries.ts — do not edit by hand.\n` +
    `// Squad rosters for the 48 WC2026 teams: bio from ESPN, club/photo from TheSportsDB.\n` +
    `import type { CountryPlayer } from "@/lib/countries";\n\n` +
    `export const COUNTRY_ROSTERS: Record<string, CountryPlayer[]> = ${JSON.stringify(out, null, 2)};\n`;
  writeFileSync("lib/countries.generated.ts", body);
  console.error(`WROTE lib/countries.generated.ts (${Object.keys(out).length} teams)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
