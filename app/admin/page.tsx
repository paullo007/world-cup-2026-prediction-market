import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { yesPrice } from "@/lib/amm";
import { formatDate, formatPercent } from "@/lib/utils";
import { ResolveButtons } from "@/components/ResolveButtons";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const markets = await db.market.findMany({
    orderBy: [{ status: "asc" }, { closesAt: "asc" }],
  });

  const unresolved = markets.filter((m) => m.status !== "RESOLVED");
  const resolved = markets.filter((m) => m.status === "RESOLVED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Admin — Market Resolution</h1>
        <p className="mt-1 text-sm text-slate-400">
          Resolve markets when results are official. Winning shares pay WC$1 each.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Awaiting resolution ({unresolved.length})</h2>
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-raised">
          {unresolved.map((m) => (
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
          {unresolved.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-400">All markets resolved.</li>
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
