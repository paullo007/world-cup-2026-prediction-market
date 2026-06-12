/**
 * One-off migration: convert the existing single-binary group-match markets into
 * 3-way fixtures. For each existing "Will X beat Y?" match market:
 *   - tag it as the HOME outcome (matchKey + outcomeType="HOME"),
 *   - create the DRAW and AWAY outcome markets if missing.
 * For matches that are already RESOLVED, the new Draw/Away markets are created
 * already resolved (NO, since they didn't happen) — no positions, no payouts.
 *
 * Idempotent: re-running only fills gaps. Dry-run by default; pass APPLY=1 to write.
 *   APPLY=1 npx tsx scripts/migrate-3way.ts
 */
import { db } from "@/lib/db";
import { matchTeams } from "@/lib/flags";
import { seedStateForProbability } from "@/lib/amm";

const APPLY = process.env.APPLY === "1";
const DRAW_P = 0.27;
const AWAY_P = 0.33;
const LIQ = 1000;

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

(async () => {
  const matches = await db.market.findMany({ where: { category: "Matches" } });
  let tagged = 0;
  let toCreate = 0;
  let createdResolved = 0;

  for (const m of matches) {
    if (m.outcomeType === "DRAW" || m.outcomeType === "AWAY") continue; // already a new market
    const teams = matchTeams(m.question);
    if (!teams) {
      console.log("  ! could not parse teams:", m.slug, "—", m.question);
      continue;
    }
    const [home, away] = teams;
    const matchKey = `${home} vs ${away}`;
    const date = m.slug.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? "2026-06-11"; // opener fallback

    // Tag the existing market as the HOME outcome.
    if (m.matchKey !== matchKey || m.outcomeType !== "HOME") {
      tagged++;
      if (APPLY)
        await db.market.update({ where: { id: m.id }, data: { matchKey, outcomeType: "HOME" } });
    }

    // If the match is already resolved, figure out the Draw/Away outcomes.
    const resolved = m.status === "RESOLVED";
    let drawOutcome: "YES" | "NO" | null = null;
    let awayOutcome: "YES" | "NO" | null = null;
    if (resolved) {
      if (m.homeGoals != null && m.awayGoals != null) {
        drawOutcome = m.homeGoals === m.awayGoals ? "YES" : "NO";
        awayOutcome = m.awayGoals > m.homeGoals ? "YES" : "NO";
      } else {
        // No score on record; a resolved YES means the home team won, so neither
        // Draw nor Away happened. (All current resolved matches are home wins.)
        drawOutcome = "NO";
        awayOutcome = "NO";
      }
    }

    const make = async (
      outcomeType: "DRAW" | "AWAY",
      slug: string,
      question: string,
      description: string,
      p: number,
      outcome: "YES" | "NO" | null
    ) => {
      const existing = await db.market.findUnique({ where: { slug } });
      if (existing) return;
      toCreate++;
      if (outcome) createdResolved++;
      console.log(`  + ${outcomeType.padEnd(4)} ${slug}${outcome ? `  [RESOLVED ${outcome}]` : ""}`);
      if (!APPLY) return;
      const state = seedStateForProbability(p, LIQ);
      await db.market.create({
        data: {
          slug,
          question,
          description,
          category: "Matches",
          closesAt: m.closesAt,
          liquidity: LIQ,
          qYes: state.qYes,
          qNo: state.qNo,
          matchKey,
          outcomeType,
          ...(outcome
            ? { status: "RESOLVED", resolvedOutcome: outcome, resolvedAt: m.resolvedAt ?? new Date() }
            : {}),
        },
      });
    };

    await make(
      "DRAW",
      `${slugify(home)}-vs-${slugify(away)}-${date}-draw`,
      `Will ${home} vs ${away} end in a draw?`,
      `Group-stage match. Resolves YES if the match is level after regulation (a draw).`,
      DRAW_P,
      drawOutcome
    );
    await make(
      "AWAY",
      `${slugify(away)}-beats-${slugify(home)}-${date}`,
      `Will ${away} beat ${home}?`,
      `Group-stage match. Resolves YES if ${away} win in regulation.`,
      AWAY_P,
      awayOutcome
    );
  }

  console.log(
    `\n${APPLY ? "APPLIED" : "DRY RUN"} — would tag HOME: ${tagged}, create new markets: ${toCreate} (of which already-resolved: ${createdResolved})`
  );
  const counts = await db.market.groupBy({
    by: ["outcomeType"],
    where: { category: "Matches" },
    _count: true,
  });
  console.log("Current Matches by outcomeType:", JSON.stringify(counts));
  await db.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
