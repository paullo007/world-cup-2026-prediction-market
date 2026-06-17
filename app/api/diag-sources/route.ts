import { NextResponse } from "next/server";
import { fetchAllSources } from "@/lib/results";

export const dynamic = "force-dynamic";

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
  if (new URL(req.url).searchParams.get("diag") !== "1") {
    return NextResponse.json({ error: "add ?diag=1" }, { status: 400 });
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
