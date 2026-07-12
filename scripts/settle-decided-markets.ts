/**
 * One-off cleanup: resolve every derived/aggregate market whose outcome is
 * already logically decided from our resolved knockout results (eliminated-team
 * winner markets → NO, achieved/unreachable milestones, decidable crazy
 * predictions). Shares the exact derivation used by the permanent auto-cascade
 * in `ingestAndPublish` (lib/eliminationSettlement.ts).
 *
 *   npx tsx scripts/settle-decided-markets.ts           # dry-run (default)
 *   npx tsx scripts/settle-decided-markets.ts --apply    # write to the live DB
 *
 * Idempotent: resolveMarket() no-ops on already-resolved markets, so re-running
 * is safe.
 */
import { computeEliminationSettlements } from "@/lib/eliminationSettlement";
import { resolveMarket } from "@/lib/trade";

async function main() {
  const apply = process.argv.includes("--apply");
  const plan = await computeEliminationSettlements();

  console.log(`${plan.length} market(s) logically decided:\n`);
  for (const s of plan) console.log(`  → ${s.outcome.padEnd(3)} ${s.question}   (${s.reason})`);

  if (!apply) {
    console.log(`\nDRY-RUN — nothing written. Re-run with --apply to resolve.`);
    return;
  }

  console.log(`\nApplying…`);
  let ok = 0;
  const errors: string[] = [];
  for (const s of plan) {
    try {
      await resolveMarket(s.marketId, s.outcome);
      ok++;
    } catch (e: any) {
      errors.push(`${s.question}: ${e?.message ?? e}`);
    }
  }
  console.log(`Resolved ${ok}/${plan.length}.`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    errors.forEach((e) => console.log(`  ✗ ${e}`));
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
