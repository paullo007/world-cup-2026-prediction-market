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
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-amber-700">
          Awaiting review
          <span
            className={
              pending.length > 0
                ? "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-2 text-sm font-bold text-white"
                : "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-surface-raised px-2 text-sm font-bold text-slate-400"
            }
          >
            {pending.length}
          </span>
        </h2>
        <ul className="space-y-4">
          {pending.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/5 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-lg font-bold leading-snug">{m.question}</p>
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Resolves</p>
                    <p className="mt-1 text-sm text-slate-200">{m.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>
                      Proposed by{" "}
                      <span className="font-semibold text-slate-200">
                        {m.proposedById ? nameById.get(m.proposedById) ?? "unknown" : "unknown"}
                      </span>
                    </span>
                    <span>Submitted: {formatDate(m.createdAt)}</span>
                    <span>Closes: {formatDate(m.closesAt)}</span>
                  </div>
                </div>
                <div className="shrink-0 md:pt-1">
                  <ProposalReviewButtons marketId={m.id} />
                </div>
              </div>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="rounded-2xl border border-surface-border bg-surface-raised px-5 py-6 text-center text-sm text-slate-400">
              🎉 No proposals awaiting review — you&apos;re all caught up.
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
