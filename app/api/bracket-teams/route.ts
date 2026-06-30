import { NextResponse } from "next/server";
import { getBracketTeams } from "@/lib/bracketSync";

// Public, display-only bracket feed: ESPN R32 draw + manual overrides, with OUR
// resolved results auto-advancing winners forward (getBracketTeams). Polled by
// the Bracket tab. Never resolves a market or pays out.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const teams = await getBracketTeams();
  return NextResponse.json({ teams }, { headers: { "Cache-Control": "no-store" } });
}
