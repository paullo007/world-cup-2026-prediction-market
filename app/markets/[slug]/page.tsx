import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { yesPrice } from "@/lib/amm";
import { firstName, formatCents, formatDate, formatPercent, formatWCD } from "@/lib/utils";
import { flag, matchTeams } from "@/lib/flags";
import { VENUES } from "@/lib/venues";
import { TradePanel } from "@/components/TradePanel";
import { PriceChart } from "@/components/PriceChart";
import { MatchStartTime } from "@/components/MatchStartTime";
import { CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: { slug: string } }) {
  const market = await db.market.findUnique({
    where: { slug: params.slug },
    include: {
      trades: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!market) notFound();

  const session = await auth();
  const position = session?.user?.id
    ? await db.position.findUnique({
        where: { userId_marketId: { userId: session.user.id, marketId: market.id } },
      })
    : null;

  const p = yesPrice(market);
  const teams = market.category === "Matches" ? matchTeams(market.question) : null;
  const venue = teams ? VENUES[`${teams[0]} vs ${teams[1]}`] : null;
  const open = market.status === "OPEN" && market.closesAt > new Date();
  const volume = market.trades.reduce((s, t) => s + t.amount, 0);

  const chartPoints = [...market.trades]
    .reverse()
    .map((t) => ({ time: t.createdAt.getTime(), price: t.priceAfter }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
            {market.category}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            {teams
              ? `${teams[0]} ${flag(teams[0])} vs ${flag(teams[1])} ${teams[1]}`
              : market.question}
          </h1>
          {market.description && (
            <p className="mt-2 text-slate-300">{market.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {market.status === "RESOLVED" ? (
                `Resolved ${market.resolvedAt ? formatDate(market.resolvedAt) : ""}`
              ) : teams ? (
                <MatchStartTime iso={market.closesAt.toISOString()} />
              ) : (
                `Closes ${formatDate(market.closesAt)}`
              )}
            </span>
            <span>{formatWCD(volume)} traded (last 30 trades)</span>
            {venue && (
              <span>
                Venue: {venue.stadium}, {venue.city}, {venue.country}
              </span>
            )}
          </div>
        </div>

        {market.status === "RESOLVED" ? (
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-5">
            <CheckCircle2
              className={market.resolvedOutcome === "YES" ? "h-8 w-8 text-yes" : "h-8 w-8 text-no"}
            />
            <div>
              <p className="font-bold">Resolved: {market.resolvedOutcome}</p>
              <p className="text-sm text-slate-400">
                Each winning share paid out 1.00 WC$.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-6 rounded-xl border border-surface-border bg-surface-raised p-5">
            <div>
              <div className="text-4xl font-extrabold text-accent">{formatPercent(p)}</div>
              <div className="text-sm text-slate-400">chance of YES</div>
            </div>
            <div className="flex gap-3 text-sm font-bold">
              <span className="rounded-lg bg-yes-dim/60 px-3 py-2 text-yes">Yes {formatCents(p)}</span>
              <span className="rounded-lg bg-no-dim/60 px-3 py-2 text-no">No {formatCents(1 - p)}</span>
            </div>
          </div>
        )}

        <PriceChart points={chartPoints} />

        <section>
          <h2 className="mb-3 text-lg font-bold">Recent activity</h2>
          {market.trades.length === 0 ? (
            <p className="text-sm text-slate-400">No trades yet — be the first.</p>
          ) : (
            <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-raised">
              {market.trades.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">{firstName(t.user.name)}</span>{" "}
                    <span className="text-slate-400">
                      {t.action === "BUY" ? "bought" : "sold"}
                    </span>{" "}
                    <span className={t.outcome === "YES" ? "font-bold text-yes" : "font-bold text-no"}>
                      {t.shares.toFixed(1)} {t.outcome}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    {formatWCD(t.amount)} · {formatPercent(t.priceAfter)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <TradePanel
          marketSlug={market.slug}
          amm={{ qYes: market.qYes, qNo: market.qNo, liquidity: market.liquidity }}
          yesShares={position?.yesShares ?? 0}
          noShares={position?.noShares ?? 0}
          open={open}
        />
        {position && (position.yesShares > 0.001 || position.noShares > 0.001) && (
          <div className="rounded-xl border border-surface-border bg-surface-raised p-5 text-sm">
            <h3 className="mb-2 font-bold">Your position</h3>
            {position.yesShares > 0.001 && (
              <div className="flex justify-between text-slate-300">
                <span className="font-semibold text-yes">YES</span>
                <span>{position.yesShares.toFixed(2)} shares</span>
              </div>
            )}
            {position.noShares > 0.001 && (
              <div className="flex justify-between text-slate-300">
                <span className="font-semibold text-no">NO</span>
                <span>{position.noShares.toFixed(2)} shares</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-surface-border pt-2 text-slate-400">
              <span>Cost basis</span>
              <span>{formatWCD(Math.max(position.costBasis, 0))}</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
