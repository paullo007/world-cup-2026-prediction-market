"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { PROPOSALS_ENABLED } from "@/lib/config";
import { useProposalsCount } from "@/components/useProposalsCount";

/**
 * Gold nudge shown ONLY to a signed-in admin when proposals are waiting. The
 * public red badge on the Propose pill is what makes the admin (who normally
 * browses as a player) notice; this banner is the follow-through — a one-click
 * path straight to the review queue. Renders nothing for non-admins, when the
 * flag is off, or when the queue is empty.
 */
export function ProposalAdminBanner() {
  const { data: session } = useSession();
  const pending = useProposalsCount();

  if (!PROPOSALS_ENABLED) return null;
  if (session?.user?.role !== "ADMIN") return null;
  if (pending <= 0) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <span className="text-lg leading-none">🔔</span>
        <span className="font-semibold text-amber-700 dark:text-amber-300">
          {pending} prediction {pending === 1 ? "proposal is" : "proposals are"} awaiting your review
        </span>
        <Link
          href="/admin/proposals"
          className="ml-auto shrink-0 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-amber-600"
        >
          Review now →
        </Link>
      </div>
    </div>
  );
}
