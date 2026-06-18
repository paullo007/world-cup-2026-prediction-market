import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { yesPrice } from "@/lib/amm";
import { cn, formatWCD } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Always-visible formula legend above a table: terse, numbers-first,
// "term = formula = numbers = result" definitions (no hover needed).
function FormulaBox({ lines }: { lines: React.ReactNode[] }) {
  return (
    <div className="mb-3 overflow-x-auto rounded-xl border border-surface-border bg-surface-raised px-4 py-3 font-mono text-xs leading-6">
      {lines.map((line, i) => (
        <div key={i} className="whitespace-nowrap">
          {line}
        </div>
      ))}
    </div>
  );
}

// One formula line: bold term, plain math, green/red final result.
function F({ term, math, result, up = true }: { term: string; math: string; result?: string; up?: boolean }) {
  return (
    <>
      <span className="font-bold">{term}</span> = {math}
      {result && (
        <>
          {" = "}
          <span className={cn("font-bold", up ? "text-emerald-600" : "text-red-600")}>{result}</span>
        </>
      )}
    </>
  );
}

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
    // Payout if this prediction is correct: each winning share redeems for 1 WC$.
    const predictionValue = pos.yesShares + pos.noShares;
    return { pos, price: p, value, predictionValue, pnl: value - Math.max(pos.costBasis, 0) };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  // If every open prediction wins: total payout − total cost basis = potential P&L.
  const totalPotentialPnl = rows.reduce(
    (s, r) => s + r.predictionValue - Math.max(r.pos.costBasis, 0),
    0
  );

  // Resolved positions — payout already credited to cash balance at resolution
  // (1.00 WC$ per winning share). Shown here as settled history with realized P&L.
  const resolvedPositions = positions.filter((p) => p.market.status === "RESOLVED");
  const resolvedRows = resolvedPositions.map((pos) => {
    const payout =
      pos.market.resolvedOutcome === "YES" ? pos.yesShares : pos.noShares;
    return { pos, payout, pnl: payout - Math.max(pos.costBasis, 0) };
  });
  const totalResolvedPnl = resolvedRows.reduce((s, r) => s + r.pnl, 0);

  // Worked example for the formula boxes = THIS user's first row (dynamic, not
  // fixed). exPrice is the price of the side they hold (YES → p, NO → 1 − p).
  const ex = rows[0];
  const exShares = (ex?.pos.yesShares ?? 0) + (ex?.pos.noShares ?? 0);
  const exPrice = ex ? (ex.pos.yesShares > 0.001 ? ex.price : 1 - ex.price) : 0;
  const exValue = ex?.value ?? 0;
  const exCost = ex ? Math.max(ex.pos.costBasis, 0) : 0;
  const exPnl = ex?.pnl ?? 0;
  const exPredVal = ex?.predictionValue ?? 0;

  const rex = resolvedRows[0];
  const rexPayout = rex?.payout ?? 0;
  const rexCost = rex ? Math.max(rex.pos.costBasis, 0) : 0;
  const rexPnl = rex?.pnl ?? 0;

  const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

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
          <>
          <FormulaBox
            lines={[
              <F
                key="v"
                term="VALUE"
                math={`shares × price = ${exShares.toFixed(1)} × ${exPrice.toFixed(4)}`}
                result={`${exValue.toFixed(2)} WC$`}
              />,
              <F
                key="p"
                term="MY P&L"
                math={`VALUE − cost = ${exValue.toFixed(2)} − ${exCost.toFixed(2)}`}
                result={`${signed(exPnl)} WC$`}
                up={exPnl >= 0}
              />,
              <F
                key="pv"
                term="MY PREDICTION VALUE"
                math="shares × 1.00 WC$"
                result={`${exPredVal.toFixed(2)} WC$`}
              />,
              <F key="t" term="TOTAL POTENTIAL P&L" math="Σ(prediction value) − Σ(cost)" />,
            ]}
          />
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">My Prediction</th>
                  <th className="px-4 py-3">My Shares</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">My Prediction Value</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">My P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.map(({ pos, price, value, predictionValue, pnl }) => (
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
                      <PredictionCell yes={pos.yesShares} no={pos.noShares} />
                    </td>
                    <td className="px-4 py-3">
                      <SharesCell yes={pos.yesShares} no={pos.noShares} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{(price * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatWCD(predictionValue)}
                    </td>
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
              <tfoot>
                <tr className="border-t-2 border-surface-border bg-surface-raised/60">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400"
                  >
                    Total Potential P&L
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right text-base font-extrabold",
                      totalPotentialPnl >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {totalPotentialPnl >= 0 ? "+" : ""}
                    {formatWCD(totalPotentialPnl)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </section>

      {resolvedRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Results ({resolvedRows.length})</h2>
          <FormulaBox
            lines={[
              <F
                key="po"
                term="PAYOUT"
                math="winning shares × 1.00 WC$"
                result={`${rexPayout.toFixed(2)} WC$`}
                up={rexPayout > 0.001}
              />,
              <F
                key="pl"
                term="MY P&L"
                math={`PAYOUT − cost = ${rexPayout.toFixed(2)} − ${rexCost.toFixed(2)}`}
                result={`${signed(rexPnl)} WC$`}
                up={rexPnl >= 0}
              />,
              <F key="t" term="TOTAL P&L" math="Σ(MY P&L)" />,
            ]}
          />
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">My Prediction</th>
                  <th className="px-4 py-3">My Shares</th>
                  <th className="px-4 py-3">My Result</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                  <th className="px-4 py-3 text-right">My P&L</th>
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
                      <PredictionCell yes={pos.yesShares} no={pos.noShares} />
                    </td>
                    <td className="px-4 py-3">
                      <SharesCell yes={pos.yesShares} no={pos.noShares} />
                    </td>
                    <td className="px-4 py-3">
                      <ResultBadge win={payout > 0.001} />
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
              <tfoot>
                <tr className="border-t-2 border-surface-border bg-surface-raised/60">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400"
                  >
                    Total P&L
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right text-base font-extrabold",
                      totalResolvedPnl >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {totalResolvedPnl >= 0 ? "+" : ""}
                    {formatWCD(totalResolvedPnl)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// The side(s) the user bet — its own column, split out from the share count.
// Both render when a position holds YES and NO (rare), one line each so the
// prediction and share columns line up.
function PredictionCell({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="space-y-0.5 font-bold">
      {yes > 0.001 && <div className="text-yes">YES</div>}
      {no > 0.001 && <div className="text-no">NO</div>}
    </div>
  );
}

function SharesCell({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="space-y-0.5 font-semibold">
      {yes > 0.001 && <div className="text-yes">{yes.toFixed(1)}</div>}
      {no > 0.001 && <div className="text-no">{no.toFixed(1)}</div>}
    </div>
  );
}

// WIN when the resolved bet paid out (held the winning side), else LOSS.
function ResultBadge({ win }: { win: boolean }) {
  return (
    <span
      className={cn(
        "inline-block rounded px-2 py-0.5 text-xs font-bold",
        win ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
      )}
    >
      {win ? "WIN" : "LOSS"}
    </span>
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
