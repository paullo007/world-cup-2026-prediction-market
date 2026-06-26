import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchBracketTeams } from "@/lib/bracketSync";

// Public, display-only bracket feed: ESPN-derived knockout teams merged with any
// manual BracketAssignment overrides (admin editor wins). Polled by the Bracket
// tab. Never resolves a market or pays out.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [espn, assignments] = await Promise.all([
    fetchBracketTeams(),
    db.bracketAssignment.findMany(),
  ]);
  const teams = { ...espn };
  for (const a of assignments) teams[a.slot] = a.team; // manual override takes precedence
  return NextResponse.json({ teams }, { headers: { "Cache-Control": "no-store" } });
}
