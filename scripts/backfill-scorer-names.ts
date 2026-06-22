/**
 * One-off backfill: sanitize already-stored goalscorer names that contain a
 * stray "null"/"undefined" token (e.g. ESPN's fullName "Trézéguet null" for a
 * mononym player). Resolution is idempotent, so the live pipeline won't rewrite
 * RESOLVED markets' scorers — hence this backfill after the parser fix.
 *
 * Cleans the `name` field of each stored Scorer in place (also assist names).
 * Dry-run by default; pass --apply to write to the live DB.
 *
 * Run: set -a; source .env; set +a; npx tsx scripts/backfill-scorer-names.ts [--apply]
 */
import { db } from "@/lib/db";
import type { Scorer } from "@/lib/results";

const APPLY = process.argv.includes("--apply");

const cleanName = (s: string): string =>
  s.replace(/\b(null|undefined)\b/gi, "").replace(/\s+/g, " ").trim();

async function main() {
  const markets = await db.market.findMany({
    where: { category: "Matches", NOT: { outcomeType: { in: ["DRAW", "AWAY"] } } },
    select: { id: true, slug: true, question: true, scorers: true },
  });

  let changedMarkets = 0;
  let changedNames = 0;

  for (const m of markets) {
    const scorers = Array.isArray(m.scorers) ? (m.scorers as unknown as Scorer[]) : [];
    if (scorers.length === 0) continue;

    let dirty = false;
    const cleaned = scorers.map((s) => {
      const next: Scorer = { ...s };
      const cn = cleanName(s.name);
      if (cn !== s.name) {
        console.log(`  ${m.question}: "${s.name}" → "${cn}"`);
        next.name = cn;
        dirty = true;
        changedNames++;
      }
      if (Array.isArray(s.assists)) {
        const ca = s.assists.map(cleanName);
        if (ca.some((a, i) => a !== s.assists![i])) {
          s.assists.forEach((a, i) => {
            if (ca[i] !== a) console.log(`  ${m.question}: assist "${a}" → "${ca[i]}"`);
          });
          next.assists = ca;
          dirty = true;
          changedNames++;
        }
      }
      return next;
    });

    if (!dirty) continue;
    changedMarkets++;
    if (APPLY) {
      await db.market.update({
        where: { id: m.id },
        data: { scorers: cleaned as unknown as object[] },
      });
    }
  }

  console.log(
    `\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${changedNames} name(s) across ${changedMarkets} market(s)` +
      (APPLY ? " written to live DB." : ". Re-run with --apply to write.")
  );
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
