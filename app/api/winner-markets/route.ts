import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canonicalTeam } from "@/lib/flags";
import { tournamentWinProbability } from "@/lib/elo";
import { seedStateForProbability } from "@/lib/amm";

export const dynamic = "force-dynamic";

// Fallbacks used only if there is somehow no existing winner market to copy
// these from (there are 11 seeded, so this is belt-and-braces).
const FALLBACK_CLOSES_AT = new Date("2026-07-19T19:00:00Z");
const FALLBACK_LIQUIDITY = 1500;

// Canonical team named in a "Will X win the 2026 FIFA World Cup?" title.
function winnerTeamOf(question: string): string | null {
  const m = question.match(/^Will (.+?) win the 2026 FIFA World Cup\?$/);
  return m ? canonicalTeam(m[1]) : null;
}

function slugFor(team: string): string {
  const base = team
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "team"}-wins-world-cup-2026`;
}

/**
 * "Predict My Own World Cup Winner" — let any signed-in user propose a winner
 * market for a team that isn't already on the pre-seeded list (e.g. Japan).
 * Creates a binary Tournament Winner market on the spot, seeded at Elo-derived
 * starting odds; the price then moves freely on trades. Matches the app's
 * zero-friction, instant-publish ethos (no admin gate). Idempotent by team:
 * if the market already exists we just return it instead of duplicating.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in to propose a winner." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw: string = typeof body?.team === "string" ? body.team : "";
  const team = canonicalTeam(raw);

  // Validate: 2–40 chars, letters/spaces and a few name punctuation marks only
  // (blocks empty, numeric, script/emoji junk while allowing accents & "Côte…").
  // Latin letters incl. accents (Türkiye, Curaçao, Côte…), then name punctuation.
  if (team.length < 2 || team.length > 40 || !/^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'’\-()&]*$/.test(team)) {
    return NextResponse.json(
      { error: "Enter a real country name (letters only, 2–40 characters)." },
      { status: 400 }
    );
  }

  // Dedupe by canonical team across every existing winner market (the slug alone
  // can miss aliases — e.g. seeded "USA" vs typed "United States").
  const existing = await db.market.findMany({
    where: { category: "Tournament Winner" },
    select: { slug: true, question: true, closesAt: true, liquidity: true },
  });
  const match = existing.find((m) => winnerTeamOf(m.question) === team);
  if (match) {
    return NextResponse.json(
      { ok: true, slug: match.slug, alreadyExists: true },
      { status: 200 }
    );
  }

  // Inherit close time + liquidity from the seeded winner markets so the new one
  // behaves identically (all winner markets close at the final).
  const template = existing[0];
  const closesAt = template?.closesAt ?? FALLBACK_CLOSES_AT;
  const liquidity = template?.liquidity ?? FALLBACK_LIQUIDITY;

  const p = tournamentWinProbability(team);
  const state = seedStateForProbability(p, liquidity);
  const slug = slugFor(team);

  try {
    const created = await db.market.create({
      data: {
        slug,
        question: `Will ${team} win the 2026 FIFA World Cup?`,
        description: `Resolves YES if ${team} lifts the trophy at the final on July 19, 2026 (MetLife Stadium, New Jersey).`,
        category: "Tournament Winner",
        closesAt,
        liquidity,
        qYes: state.qYes,
        qNo: state.qNo,
      },
      select: { slug: true },
    });
    return NextResponse.json({ ok: true, slug: created.slug }, { status: 201 });
  } catch (e) {
    // Unique slug race: someone created the same team between findMany and now.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, slug, alreadyExists: true }, { status: 200 });
    }
    throw e;
  }
}
