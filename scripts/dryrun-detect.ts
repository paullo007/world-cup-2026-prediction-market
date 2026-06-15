// READ-ONLY diagnostic: fetch both sources and show what the ingest pipeline
// would detect for given pairs. No DB writes. Run: npx tsx scripts/dryrun-detect.ts
import { fetchAllSources, mergeForMarket } from "@/lib/results";

const PAIRS: [string, string][] = [
  ["Sweden", "Tunisia"],
  ["Germany", "Curaçao"],
  ["Netherlands", "Japan"],
  ["Ivory Coast", "Ecuador"],
];

async function main() {
  const sources = await fetchAllSources();
  for (const s of sources) {
    console.log(`SOURCE ${s.source}: ${s.matches.length} finished${s.error ? "  ERROR=" + s.error : ""}`);
  }
  console.log("---");
  for (const [h, a] of PAIRS) {
    const merged = mergeForMarket(h, a, sources);
    if (!merged) {
      console.log(`${h} vs ${a}: NOT DETECTED (no source has it finished)`);
    } else {
      console.log(`${h} vs ${a}: DETECTED winner=${merged.winner} score=${merged.homeGoals}-${merged.awayGoals} sources=[${merged.sources.join(",")}] agree=${merged.agree}`);
      console.log(`   detail: ${merged.detail}`);
    }
  }
}
main();
