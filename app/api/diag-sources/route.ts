import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchTeams } from "@/lib/flags";
import { fetchAllSources, mergeForMarket } from "@/lib/results";

export const dynamic = "force-dynamic";

class Rollback extends Error {}

// Dry-run the real ingest matching, then ATTEMPT the resolve writes inside a
// transaction that always rolls back — so we see exactly what (if anything) the
// resolve step throws in prod, without mutating any data.
async function dryRunIngest() {
  const sources = await fetchAllSources();
  const markets = await db.market.findMany({
    where: { category: "Matches", status: { not: "RESOLVED" }, OR: [{ outcomeType: "HOME" }, { outcomeType: null }] },
  });
  let matched = 0;
  let unmatched = 0;
  const resolveErrors: string[] = [];
  const resolveOk: string[] = [];
  for (const m of markets) {
    let home: string | undefined;
    let away: string | undefined;
    if (m.matchKey) [home, away] = m.matchKey.split(" vs ");
    else { const t = matchTeams(m.question); if (t) [home, away] = t; }
    if (!home || !away) continue;
    const merged = mergeForMarket(home, away, sources);
    if (!merged) { unmatched++; continue; }
    matched++;
    const label = m.matchKey ?? m.question;
    try {
      await db.$transaction(async (tx) => {
        const group = await tx.market.findMany({ where: { matchKey: m.matchKey ?? "", status: { not: "RESOLVED" } } });
        for (const gm of group) {
          const positions = await tx.position.findMany({ where: { marketId: gm.id } });
          for (const pos of positions) {
            const payout = (gm.outcomeType === merged.winner ? "YES" : "NO") === "YES" ? pos.yesShares : pos.noShares;
            if (payout > 0) await tx.user.update({ where: { id: pos.userId }, data: { balance: { increment: payout } } });
          }
          await tx.market.update({ where: { id: gm.id }, data: { status: "RESOLVED", resolvedOutcome: gm.outcomeType === merged.winner ? "YES" : "NO", resolvedAt: new Date() } });
        }
        throw new Rollback("ok"); // undo everything
      });
    } catch (e) {
      if (e instanceof Rollback) resolveOk.push(label);
      else resolveErrors.push(`${label}: ${e instanceof Error ? `${e.constructor.name}: ${e.message}` : "threw"}`);
    }
  }
  return { totalMarkets: markets.length, matched, unmatched, resolveOkCount: resolveOk.length, resolveOk: resolveOk.slice(0, 6), resolveErrors: resolveErrors.slice(0, 6) };
}

// TEMPORARY read-only diagnostic: shows what each results source returns from
// inside the Vercel runtime (count + any error), plus raw HTTP probes of the two
// keyless sources so we can see status codes (e.g. a 403 datacenter block). No
// DB access, no writes. Remove after diagnosis.
async function probe(label: string, url: string, headers?: Record<string, string>) {
  const started = Date.now();
  try {
    const res = await fetch(url, { cache: "no-store", headers });
    const text = await res.text();
    return {
      label,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      ms: Date.now() - started,
      bytes: text.length,
      sample: text.slice(0, 200),
    };
  } catch (e) {
    return { label, error: e instanceof Error ? e.message : "fetch threw", ms: Date.now() - started };
  }
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  if (sp.get("diag") !== "1") {
    return NextResponse.json({ error: "add ?diag=1" }, { status: 400 });
  }

  if (sp.get("dryrun") === "1") {
    return NextResponse.json(await dryRunIngest());
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const [sources, espnProbe, espnUaProbe, s365Probe] = await Promise.all([
    fetchAllSources(),
    probe("ESPN (no UA)", `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${today}`),
    probe("ESPN (browser UA)", `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${today}`, {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    }),
    probe("365Scores", `https://webws.365scores.com/web/games/?appTypeId=5&langId=1&timezoneName=UTC&competitions=5930&startDate=01/01/2026&endDate=${String(new Date().getUTCDate()).padStart(2, "0")}/${String(new Date().getUTCMonth() + 1).padStart(2, "0")}/2026`, {
      "User-Agent": "Mozilla/5.0",
    }),
  ]);

  return NextResponse.json({
    runtimeRegion: process.env.VERCEL_REGION ?? "unknown",
    pipeline: sources.map((s) => ({ source: s.source, finished: s.matches.length, error: s.error ?? null })),
    probes: [espnProbe, espnUaProbe, s365Probe],
  });
}
