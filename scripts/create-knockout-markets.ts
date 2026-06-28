// Create tradeable 2-way (Team A wins / Team B wins) markets for knockout
// fixtures whose BOTH teams are now known — reusing the group-stage 3-way engine
// minus the Draw (knockouts can't end level). Run this once per round as the
// bracket fills in (R32 now, R16 after R32 finishes, …). Idempotent: a fixture
// that already has markets is skipped, so re-running is safe.
//
// Run: set -a; source .env; set +a; npx tsx scripts/create-knockout-markets.ts [--apply]
import { db } from "../lib/db";
import { seedStateForProbability } from "../lib/amm";
import { knockoutProbabilities } from "../lib/elo";
import { knockoutFixtures } from "../lib/bracket";
import { fetchBracketTeams } from "../lib/bracketSync";
import { ALL_TEAMS } from "../lib/flags";

const apply = process.argv.includes("--apply");
const LIQUIDITY = 1000;
const CATEGORY = "KnockoutMatches";

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

async function main() {
  const isReal = new Set(ALL_TEAMS);

  // Bracket teams: ESPN auto-fill merged with manual admin overrides (admin wins) —
  // same precedence the app uses for /api/bracket-teams.
  const espnTeams = await fetchBracketTeams();
  const assignments = await db.bracketAssignment.findMany();
  const teamMap: Record<string, string> = { ...espnTeams };
  for (const a of assignments) teamMap[a.slot] = a.team;

  const fixtures = knockoutFixtures(teamMap);

  let planned = 0;
  let skippedTbd = 0;
  let skippedExisting = 0;

  console.log(`${apply ? "APPLY" : "DRY-RUN"} — knockout 2-way markets (category ${CATEGORY})\n`);

  for (const f of fixtures) {
    const { teamA, teamB } = f;
    if (!teamA || !teamB || !isReal.has(teamA) || !isReal.has(teamB)) {
      skippedTbd++;
      continue;
    }
    const matchKey = `${teamA} vs ${teamB}`;
    const existing = await db.market.findFirst({ where: { matchKey, category: CATEGORY } });
    if (existing) {
      skippedExisting++;
      continue;
    }

    const probs = knockoutProbabilities(teamA, teamB);
    const date = slugify(f.date); // YYYY-MM-DD → safe in slug
    const desc = `${f.round} (Match ${f.num}) on ${longDate(f.kickoff)} at ${f.venue.stadium}, ${f.venue.city}. Resolves YES if {team} advance (extra time + penalties count).`;

    const rows = [
      {
        slug: `${slugify(teamA)}-beats-${slugify(teamB)}-${date}-ko`,
        question: `Will ${teamA} beat ${teamB}?`,
        description: desc.replace("{team}", teamA),
        outcomeType: "HOME" as const,
        probability: probs.HOME,
      },
      {
        slug: `${slugify(teamB)}-beats-${slugify(teamA)}-${date}-ko`,
        question: `Will ${teamB} beat ${teamA}?`,
        description: desc.replace("{team}", teamB),
        outcomeType: "AWAY" as const,
        probability: probs.AWAY,
      },
    ];

    console.log(
      `  ${f.round.padEnd(20)} ${matchKey}  →  ${teamA} ${(probs.HOME * 100).toFixed(0)}% / ${teamB} ${(probs.AWAY * 100).toFixed(0)}%`
    );

    if (apply) {
      for (const r of rows) {
        const state = seedStateForProbability(r.probability, LIQUIDITY);
        await db.market.upsert({
          where: { slug: r.slug },
          update: {},
          create: {
            slug: r.slug,
            question: r.question,
            description: r.description,
            category: CATEGORY,
            closesAt: new Date(f.kickoff),
            liquidity: LIQUIDITY,
            qYes: state.qYes,
            qNo: state.qNo,
            matchKey,
            outcomeType: r.outcomeType,
          },
        });
      }
    }
    planned++;
  }

  console.log(
    `\n${apply ? "Created" : "Would create"} markets for ${planned} fixture(s). ` +
      `Skipped: ${skippedExisting} already exist, ${skippedTbd} with TBD teams.`
  );
  if (!apply) console.log("(dry-run — no changes written. Re-run with --apply to commit.)");
}

main().finally(() => db.$disconnect());
