import type { Prisma } from "@prisma/client";

// Category bucket for every user-proposed market — distinct from the seeded 379
// so proposals are trivially identifiable (and cleanly removable on pull-back).
export const PROPOSAL_CATEGORY = "Community";

// Proposed markets close (stop trading) at the tournament's end by default; the
// proposer picks the actual close date, but this bounds it.
export const PROPOSAL_MAX_CLOSE = new Date("2026-07-19T23:59:00Z");
// Proposed markets are seeded at neutral 50/50 with modest liquidity (no model
// exists for an arbitrary claim, so the crowd sets the price from even odds).
export const PROPOSAL_LIQUIDITY = 300;

/**
 * Prisma filter that keeps a proposal-aware query showing only PUBLIC markets:
 * every normal market (proposalStatus NULL) plus APPROVED proposals, while
 * hiding PENDING/REJECTED ones. Written as an OR on NULL/"APPROVED" rather than
 * `NOT in [...]` on purpose — a NOT-in filter drops NULL rows under SQL's
 * three-valued logic (the documented NULL-outcome trap), which would silently
 * hide the entire baseline. Combine with other filters via AND.
 */
export const VISIBLE_PROPOSAL: Prisma.MarketWhereInput = {
  OR: [{ proposalStatus: null }, { proposalStatus: "APPROVED" }],
};

export interface ProposalInput {
  question: string;
  rules: string;
  closesAt: Date;
}

export interface ValidatedProposal {
  question: string;
  rules: string;
  closesAt: Date;
}

/**
 * Validate + normalize a raw proposal submission. Returns either the cleaned
 * fields or a human-readable error. Deliberately strict on the question (a
 * well-formed market needs an unambiguous YES/NO claim) but lenient on wording;
 * the admin review queue is the real quality gate.
 */
export function validateProposal(raw: {
  question?: unknown;
  rules?: unknown;
  closesAt?: unknown;
}): { ok: true; value: ValidatedProposal } | { ok: false; error: string } {
  const question = typeof raw.question === "string" ? raw.question.trim().replace(/\s+/g, " ") : "";
  const rules = typeof raw.rules === "string" ? raw.rules.trim().replace(/\s+/g, " ") : "";
  const closesRaw = typeof raw.closesAt === "string" ? raw.closesAt : "";

  if (question.length < 12 || question.length > 200) {
    return { ok: false, error: "Question must be 12–200 characters." };
  }
  if (!question.includes("?")) {
    return { ok: false, error: "Phrase your prediction as a yes/no question ending in “?”." };
  }
  if (rules.length < 10 || rules.length > 500) {
    return { ok: false, error: "Resolution criteria must be 10–500 characters." };
  }

  const closesAt = new Date(closesRaw);
  if (isNaN(closesAt.getTime())) {
    return { ok: false, error: "Pick a valid close date." };
  }
  const now = Date.now();
  if (closesAt.getTime() < now + 60 * 60 * 1000) {
    return { ok: false, error: "Close date must be at least an hour from now." };
  }
  if (closesAt.getTime() > PROPOSAL_MAX_CLOSE.getTime()) {
    return { ok: false, error: "Close date can’t be after the tournament ends (Jul 19, 2026)." };
  }

  return { ok: true, value: { question, rules, closesAt } };
}

/**
 * A URL-safe, reasonably-unique slug for a proposed market: a kebab-cased prefix
 * of the question plus a short random suffix (proposals are free-text, so a
 * random suffix avoids collisions without a dedupe lookup).
 */
export function proposalSlug(question: string): string {
  const base = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "prediction"}-${suffix}`;
}
