import { NextResponse } from "next/server";
import { fetchLiveScores } from "@/lib/liveScores";

// Public, display-only live-score feed. Proxies ESPN (avoids browser CORS +
// canonicalizes team names server-side). Never resolves markets or pays out —
// that stays in the completed=true resolution pipeline.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const matches = await fetchLiveScores();
  return NextResponse.json(
    { matches, fetchedAt: Date.now() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
