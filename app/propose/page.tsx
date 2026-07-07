import { notFound } from "next/navigation";
import Link from "next/link";
import { PROPOSALS_ENABLED } from "@/lib/config";
import { ProposeForm } from "@/components/ProposeForm";

export const dynamic = "force-dynamic";

/**
 * "Propose a Prediction" tab — a free-style prediction form. Gated behind the
 * PROPOSALS_ENABLED flag: when off, the route 404s (the pull-back switch also
 * closes the page, not just the pill).
 */
export default function ProposePage() {
  if (!PROPOSALS_ENABLED) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Propose a Prediction</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Got a World Cup call the markets don&apos;t cover yet? Propose your own yes/no
          prediction. After a quick admin review it opens at 50/50 for everyone to trade —
          see the live ones under{" "}
          <Link href="/?category=Community" className="text-accent hover:underline">
            Community predictions
          </Link>
          .
        </p>
      </div>

      <ProposeForm />
    </div>
  );
}
