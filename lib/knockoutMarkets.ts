// Auto-create tradeable 2-way (Team A wins / Team B wins) markets for knockout
// fixtures whose BOTH teams are now known — reusing the group-stage engine minus
// the Draw (knockouts can't end level). Idempotent: a fixture that already has
// markets is skipped, so this is safe to run on every settlement cycle. It's
// wired into ingestAndPublish() so each round's markets self-open within minutes
// of the teams being confirmed — no manual step. scripts/create-knockout-markets
// is a thin CLI wrapper over this for forcing/previewing it on demand.
import { db } from "@/lib/db";
import { seedStateForProbability } from "@/lib/amm";
import { knockoutProbabilities } from "@/lib/elo";
import { knockoutFixtures } from "@/lib/bracket";
import { getBracketTeams } from "@/lib/bracketSync";
import { ALL_TEAMS } from "@/lib/flags";

export const KNOCKOUT_CATEGORY = "KnockoutMatches";
const LIQUIDITY = 1000;

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

export interface PlannedFixture {
  matchKey: string;
  round: string;
  home: string;
  away: string;
  pHome: number;
  pAway: number;
}

export interface EnsureResult {
  created: PlannedFixture[]; // created (or, in dryRun, would-create)
  skippedExisting: number;
  skippedTbd: number;
}

/**
 * Create the 2-way markets for every knockout fixture whose both teams are now
 * real (confirmed) and that doesn't already have markets. Pass `dryRun` to
 * compute the plan without writing.
 */
export async function ensureKnockoutMarkets(opts: { dryRun?: boolean } = {}): Promise<EnsureResult> {
  const { dryRun = false } = opts;
  const isReal = new Set(ALL_TEAMS);

  // Bracket teams: ESPN R32 draw + manual overrides + OUR resolved results
  // auto-advancing winners forward — so R16+ markets auto-create from our own
  // advancement (no dependency on ESPN's later-round feed / EVENT_TO_MATCH).
  const teamMap = await getBracketTeams();

  const fixtures = knockoutFixtures(teamMap);

  const created: PlannedFixture[] = [];
  let skippedExisting = 0;
  let skippedTbd = 0;

  for (const f of fixtures) {
    const { teamA, teamB } = f;
    if (!teamA || !teamB || !isReal.has(teamA) || !isReal.has(teamB)) {
      skippedTbd++;
      continue;
    }
    const matchKey = `${teamA} vs ${teamB}`;
    const existing = await db.market.findFirst({
      where: { matchKey, category: KNOCKOUT_CATEGORY },
      select: { id: true },
    });
    if (existing) {
      skippedExisting++;
      continue;
    }

    const probs = knockoutProbabilities(teamA, teamB);
    const date = f.date; // YYYY-MM-DD
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

    if (!dryRun) {
      for (const r of rows) {
        const state = seedStateForProbability(r.probability, LIQUIDITY);
        await db.market.upsert({
          where: { slug: r.slug },
          update: {},
          create: {
            slug: r.slug,
            question: r.question,
            description: r.description,
            category: KNOCKOUT_CATEGORY,
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
    created.push({ matchKey, round: f.round, home: teamA, away: teamB, pHome: probs.HOME, pAway: probs.AWAY });
  }

  return { created, skippedExisting, skippedTbd };
}
