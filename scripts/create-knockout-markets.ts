// Thin CLI wrapper over lib/knockoutMarkets.ensureKnockoutMarkets() to force or
// preview knockout-market creation on demand. NOTE: this is now AUTOMATIC —
// ingestAndPublish() calls ensureKnockoutMarkets() on every settlement cycle, so
// each round's markets self-open within minutes of the teams being confirmed.
// This script is only a manual fallback / preview.
//
// Run: set -a; source .env; set +a; npx tsx scripts/create-knockout-markets.ts [--apply]
import { db } from "../lib/db";
import { ensureKnockoutMarkets } from "../lib/knockoutMarkets";

const apply = process.argv.includes("--apply");

async function main() {
  console.log(`${apply ? "APPLY" : "DRY-RUN"} — knockout 2-way markets\n`);
  const res = await ensureKnockoutMarkets({ dryRun: !apply });

  for (const f of res.created) {
    console.log(
      `  ${f.round.padEnd(20)} ${f.matchKey}  →  ${f.home} ${(f.pHome * 100).toFixed(0)}% / ${f.away} ${(f.pAway * 100).toFixed(0)}%`
    );
  }
  console.log(
    `\n${apply ? "Created" : "Would create"} markets for ${res.created.length} fixture(s). ` +
      `Skipped: ${res.skippedExisting} already exist, ${res.skippedTbd} with TBD teams.`
  );
  if (!apply) console.log("(dry-run — no changes written. Re-run with --apply to commit.)");
}

main().finally(() => db.$disconnect());
