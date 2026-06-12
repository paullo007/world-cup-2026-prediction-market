import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { yesPrice } from "@/lib/amm";
import { awaitingResult, formatDate, formatPercent } from "@/lib/utils";
import { ResolveButtons } from "@/components/ResolveButtons";
import { ApproveResultButton } from "@/components/ApproveResultButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const markets = await db.market.findMany({
    orderBy: [{ status: "asc" }, { closesAt: "asc" }],
  });

  // "Ready to resolve" = trading window closed (kickoff passed) but not yet resolved.
  // "Open" = still trading. Resolved = settled.
  const ready = markets.filter((m) => awaitingResult(m));
  const open = markets.filter((m) => m.status !== "RESOLVED" && !awaitingResult(m));
  const resolved = markets.filter((m) => m.status === "RESOLVED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Admin — Market Resolution</h1>
        <p className="mt-1 text-sm text-slate-400">
          Resolve markets when results are official. Winning shares pay 1.00 WC$ each.{" "}
          <Link href="/admin/bracket" className="font-semibold text-accent hover:underline">
            Edit tournament bracket →
          </Link>{" "}
          <Link href="/admin/sources" className="font-semibold text-accent hover:underline">
            Compare score sources →
          </Link>
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-700">
          Ready to resolve ({ready.length})
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Trading has closed (kickoff passed) — these need an official result.
        </p>
        <ul className="divide-y divide-surface-border rounded-xl border border-amber-600/40 bg-amber-600/5">
          {ready.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/markets/${m.slug}`} className="font-semibold hover:text-accent">
                  {m.question}
                </Link>
                <p className="text-xs text-slate-400">
                  {m.category} · closed {formatDate(m.closesAt)} · YES at{" "}
                  {formatPercent(yesPrice(m))}
                </p>
                {m.pendingOutcome && (
                  <p className="mt-1 text-xs font-semibold text-accent">
                    Auto-detected: {m.resultDetail ?? m.pendingOutcome} → resolve{" "}
                    {m.pendingOutcome}
                    {m.resultSource ? ` (${m.resultSource})` : ""}
                  </p>
                )}
              </div>
              {m.pendingOutcome && (
                <ApproveResultButton marketId={m.id} outcome={m.pendingOutcome} />
              )}
              <ResolveButtons marketId={m.id} />
            </li>
          ))}
          {ready.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-400">Nothing waiting on a result.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Open — still trading ({open.length})</h2>
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-raised">
          {open.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/markets/${m.slug}`} className="font-semibold hover:text-accent">
                  {m.question}
                </Link>
                <p className="text-xs text-slate-400">
                  {m.category} · closes {formatDate(m.closesAt)} · YES at{" "}
                  {formatPercent(yesPrice(m))}
                </p>
              </div>
              <ResolveButtons marketId={m.id} />
            </li>
          ))}
          {open.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-400">No markets currently open.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Resolved ({resolved.length})</h2>
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-raised">
          {resolved.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="flex-1">{m.question}</span>
              <span
                className={
                  m.resolvedOutcome === "YES"
                    ? "font-bold text-yes"
                    : "font-bold text-no"
                }
              >
                {m.resolvedOutcome}
              </span>
            </li>
          ))}
          {resolved.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-400">Nothing resolved yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
