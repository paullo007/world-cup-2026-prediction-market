import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { yesPrice } from "@/lib/amm";
import { cn, formatPercent, formatWCD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, positions] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id } }),
    db.position.findMany({
      where: {
        userId: session.user.id,
        OR: [{ yesShares: { gt: 0.001 } }, { noShares: { gt: 0.001 } }],
      },
      include: { market: true },
    }),
  ]);
  if (!user) redirect("/login");

  const openPositions = positions.filter((p) => p.market.status !== "RESOLVED");
  const rows = openPositions.map((pos) => {
    const p = yesPrice(pos.market);
    const value = pos.yesShares * p + pos.noShares * (1 - p);
    return { pos, price: p, value, pnl: value - Math.max(pos.costBasis, 0) };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  // Resolved positions — payout already credited to cash balance at resolution
  // (1.00 WC$ per winning share). Shown here as settled history with realized P&L.
  const resolvedPositions = positions.filter((p) => p.market.status === "RESOLVED");
  const resolvedRows = resolvedPositions.map((pos) => {
    const payout =
      pos.market.resolvedOutcome === "YES" ? pos.yesShares : pos.noShares;
    return { pos, payout, pnl: payout - Math.max(pos.costBasis, 0) };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Portfolio</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Cash balance" value={formatWCD(user.balance)} />
        <Stat label="Positions value" value={formatWCD(totalValue)} />
        <Stat label="Net worth" value={formatWCD(user.balance + totalValue)} highlight />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Open positions</h2>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-surface-border bg-surface-raised p-6 text-sm text-slate-400">
            No open positions.{" "}
            <Link href="/" className="font-semibold text-accent hover:underline">
              Browse markets
            </Link>{" "}
            to start trading.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Shares</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.map(({ pos, price, value, pnl }) => (
                  <tr key={pos.id} className="hover:bg-surface-raised/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/markets/${pos.market.slug}`}
                        className="font-semibold hover:text-accent"
                      >
                        {pos.market.question}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {pos.yesShares > 0.001 && (
                        <span className="mr-2 font-semibold text-yes">
                          {pos.yesShares.toFixed(1)} YES
                        </span>
                      )}
                      {pos.noShares > 0.001 && (
                        <span className="font-semibold text-no">
                          {pos.noShares.toFixed(1)} NO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatPercent(price)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatWCD(value)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold",
                        pnl >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {formatWCD(pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resolvedRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Results ({resolvedRows.length})</h2>
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Your shares</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {resolvedRows.map(({ pos, payout, pnl }) => (
                  <tr key={pos.id} className="hover:bg-surface-raised/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/markets/${pos.market.slug}`}
                        className="font-semibold hover:text-accent"
                      >
                        {pos.market.question}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-bold",
                          pos.market.resolvedOutcome === "YES" ? "text-yes" : "text-no"
                        )}
                      >
                        {pos.market.resolvedOutcome}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {pos.yesShares > 0.001 && (
                        <span className="mr-2 font-semibold text-yes">
                          {pos.yesShares.toFixed(1)} YES
                        </span>
                      )}
                      {pos.noShares > 0.001 && (
                        <span className="font-semibold text-no">
                          {pos.noShares.toFixed(1)} NO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatWCD(payout)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold",
                        pnl >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {formatWCD(pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", highlight && "text-emerald-600")}>
        {value}
      </p>
    </div>
  );
}
