import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { PROPOSAL_CATEGORY } from "@/lib/proposals";
import { ProposalReviewButtons } from "@/components/ProposalReviewButtons";

export const dynamic = "force-dynamic";

/**
 * Admin review queue for user-proposed predictions. Lists PENDING proposals with
 * their question + resolution criteria + proposer + close date, and Approve /
 * Reject controls. Approved/rejected history is shown below for reference.
 */
export default async function AdminProposalsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const proposals = await db.market.findMany({
    where: { category: PROPOSAL_CATEGORY, proposalStatus: { not: null } },
    orderBy: [{ createdAt: "desc" }],
  });

  // Map proposer ids → display names (no FK relation, so look them up).
  const proposerIds = Array.from(new Set(proposals.map((p) => p.proposedById).filter((x): x is string => Boolean(x))));
  const users = proposerIds.length
    ? await db.user.findMany({ where: { id: { in: proposerIds } }, select: { id: true, name: true, nickname: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.nickname || u.name]));

  const pending = proposals.filter((p) => p.proposalStatus === "PENDING");
  const decided = proposals.filter((p) => p.proposalStatus !== "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Admin — Proposal Review</h1>
        <p className="mt-1 text-sm text-slate-400">
          Approve user-proposed predictions to make them live &amp; tradeable, or reject spam /
          ambiguous / duplicate ones.{" "}
          <Link href="/admin" className="font-semibold text-accent hover:underline">
            ← Back to market resolution
          </Link>
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-700">Awaiting review ({pending.length})</h2>
        <ul className="space-y-3">
          {pending.map((m) => (
            <li key={m.id} className="rounded-xl border border-amber-600/40 bg-amber-600/5 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.question}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className="font-semibold text-slate-400">Resolves:</span> {m.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Proposed by {m.proposedById ? nameById.get(m.proposedById) ?? "unknown" : "unknown"} ·
                    closes {formatDate(m.closesAt)} · submitted {formatDate(m.createdAt)}
                  </p>
                </div>
                <ProposalReviewButtons marketId={m.id} />
              </div>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="rounded-xl border border-surface-border bg-surface-raised px-5 py-4 text-sm text-slate-400">
              No proposals awaiting review.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Reviewed ({decided.length})</h2>
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-raised">
          {decided.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1">
                {m.proposalStatus === "APPROVED" ? (
                  <Link href={`/markets/${m.slug}`} className="hover:text-accent">
                    {m.question}
                  </Link>
                ) : (
                  m.question
                )}
              </span>
              <span
                className={
                  m.proposalStatus === "APPROVED" ? "font-bold text-yes" : "font-bold text-no"
                }
              >
                {m.proposalStatus}
              </span>
            </li>
          ))}
          {decided.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-400">Nothing reviewed yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
