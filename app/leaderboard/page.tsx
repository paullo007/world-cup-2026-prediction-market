import { db } from "@/lib/db";
import { yesPrice } from "@/lib/amm";
import { cn, firstName, formatWCD } from "@/lib/utils";
import { Medal } from "lucide-react";

export const dynamic = "force-dynamic";

const STARTING_BALANCE = 10000;

export default async function LeaderboardPage() {
  const users = await db.user.findMany({
    where: { role: "USER" },
    include: {
      positions: {
        where: { OR: [{ yesShares: { gt: 0.001 } }, { noShares: { gt: 0.001 } }] },
        include: { market: { select: { qYes: true, qNo: true, liquidity: true, status: true } } },
      },
    },
  });

  const ranked = users
    .map((u) => {
      const positionsValue = u.positions.reduce((sum, pos) => {
        if (pos.market.status === "RESOLVED") return sum;
        const p = yesPrice(pos.market);
        return sum + pos.yesShares * p + pos.noShares * (1 - p);
      }, 0);
      const netWorth = u.balance + positionsValue;
      return { name: firstName(u.name), netWorth, profit: netWorth - STARTING_BALANCE };
    })
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, 50);

  const medals = ["text-amber-600", "text-slate-300", "text-amber-700"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Net worth = cash + market value of open positions. Everyone is given 10,000 WC$.
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-surface-border bg-surface-raised p-6 text-sm text-slate-400">
          No traders yet — be the first to sign up.
        </p>
      ) : (
        <ol className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-raised">
          {ranked.map((u, i) => (
            <li key={u.name + i} className="flex items-center gap-4 px-5 py-3">
              <span className="w-8 text-center font-extrabold text-slate-400">
                {i < 3 ? <Medal className={cn("mx-auto h-5 w-5", medals[i])} /> : i + 1}
              </span>
              <span className="flex-1 font-semibold">{u.name}</span>
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-semibold",
                  u.profit >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {u.profit >= 0 ? "+" : ""}
                {formatWCD(u.profit)}
              </span>
              <span className="whitespace-nowrap text-right font-extrabold">{formatWCD(u.netWorth)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
