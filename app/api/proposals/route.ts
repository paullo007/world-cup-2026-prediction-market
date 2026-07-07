import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROPOSALS_ENABLED } from "@/lib/config";
import { seedStateForProbability } from "@/lib/amm";
import {
  PROPOSAL_CATEGORY,
  PROPOSAL_LIQUIDITY,
  proposalSlug,
  validateProposal,
} from "@/lib/proposals";

export const dynamic = "force-dynamic";

/**
 * "Propose a Prediction" — a signed-in user submits a free-text yes/no market.
 * It is created as a PENDING community market (hidden + untradeable) seeded at
 * neutral 50/50 odds, and only becomes live once an admin approves it on
 * /admin/proposals. Gated behind the PROPOSALS_ENABLED feature flag: when the
 * flag is off the endpoint 404s, so pulling the feature also closes this door.
 */
export async function POST(req: Request) {
  if (!PROPOSALS_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to propose a prediction." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateProposal(body ?? {});
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { question, rules, closesAt } = parsed.value;

  // Light spam guard: cap how many proposals one user can have awaiting review at
  // once (approved ones don't count). Keeps the queue sane without a hard limit.
  const pendingMine = await db.market.count({
    where: { proposedById: session.user.id, proposalStatus: "PENDING" },
  });
  if (pendingMine >= 10) {
    return NextResponse.json(
      { error: "You already have 10 proposals awaiting review — wait for those first." },
      { status: 429 }
    );
  }

  // Neutral 50/50 seed: no model exists for an arbitrary claim, so the crowd
  // finds the price from even odds.
  const state = seedStateForProbability(0.5, PROPOSAL_LIQUIDITY);

  const created = await db.market.create({
    data: {
      slug: proposalSlug(question),
      question,
      // The proposer's resolution criteria drives the "what YES means" bar.
      description: rules,
      category: PROPOSAL_CATEGORY,
      closesAt,
      liquidity: PROPOSAL_LIQUIDITY,
      qYes: state.qYes,
      qNo: state.qNo,
      proposalStatus: "PENDING",
      proposedById: session.user.id,
    },
    select: { slug: true },
  });

  return NextResponse.json({ ok: true, slug: created.slug }, { status: 201 });
}
