import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { matchTeams } from "@/lib/flags";
import { cn } from "@/lib/utils";
import {
  fetchAllSources,
  pairKey,
  type FinishedMatch,
  type Source,
} from "@/lib/results";

export const dynamic = "force-dynamic";

function winnerLabel(m: FinishedMatch): string {
  if (m.winner === "DRAW") return "Draw";
  return m.winner === "HOME" ? m.home : m.away;
}

function Cell({ m }: { m?: FinishedMatch }) {
  if (!m) return <span className="text-slate-400">—</span>;
  return (
    <span>
      <span className="font-semibold">
        {m.homeGoals ?? "?"}–{m.awayGoals ?? "?"}
      </span>{" "}
      <span className="text-slate-400">· {winnerLabel(m)}</span>
    </span>
  );
}

export default async function SourcesDiagnosticPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const [sources, marketRows] = await Promise.all([
    fetchAllSources(),
    db.market.findMany({ where: { category: "Matches" }, select: { slug: true, question: true } }),
  ]);

  const bySource = (s: Source) => sources.find((x) => x.source === s);
  const espn = bySource("ESPN");
  const tsdb = bySource("TheSportsDB");

  // Which finished pairs correspond to a real market (so we can see coverage)?
  const marketByPair = new Map<string, string>(); // pairKey -> slug
  for (const r of marketRows) {
    const t = matchTeams(r.question);
    if (t) marketByPair.set(pairKey(t[0], t[1]), r.slug);
  }

  // Union of finished matches across both sources, keyed by pair.
  const rows = new Map<string, { espn?: FinishedMatch; tsdb?: FinishedMatch; sample: FinishedMatch }>();
  for (const m of espn?.matches ?? []) {
    const k = pairKey(m.home, m.away);
    rows.set(k, { ...(rows.get(k) ?? { sample: m }), espn: m, sample: m });
  }
  for (const m of tsdb?.matches ?? []) {
    const k = pairKey(m.home, m.away);
    const prev = rows.get(k);
    rows.set(k, { ...(prev ?? { sample: m }), tsdb: m, sample: prev?.sample ?? m });
  }

  const allRows = Array.from(rows.entries()).sort((a, b) =>
    a[1].sample.date < b[1].sample.date ? -1 : 1
  );

  let agreeCount = 0;
  let disagreeCount = 0;
  for (const [, v] of allRows) {
    if (v.espn && v.tsdb) (winnerLabel(v.espn) === winnerLabel(v.tsdb) ? agreeCount++ : disagreeCount++);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Score sources — diagnostic</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live comparison of both feeds. Use this over the tournament to see which
          is more accurate and complete.{" "}
          <Link href="/admin" className="font-semibold text-accent hover:underline">
            ← Back to admin
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="ESPN finished" value={espn?.matches.length ?? 0} sub={espn?.error} />
        <Stat label="TheSportsDB finished" value={tsdb?.matches.length ?? 0} sub={tsdb?.error} />
        <Stat label="Both agree" value={agreeCount} />
        <Stat label="Disagree" value={disagreeCount} highlight={disagreeCount > 0} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">ESPN</th>
              <th className="px-4 py-3">TheSportsDB</th>
              <th className="px-4 py-3">Agree?</th>
              <th className="px-4 py-3">Market?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {allRows.map(([k, v]) => {
              const both = v.espn && v.tsdb;
              const agree = both && winnerLabel(v.espn!) === winnerLabel(v.tsdb!);
              const slug = marketByPair.get(k);
              return (
                <tr key={k} className="hover:bg-surface-raised/50">
                  <td className="px-4 py-3 text-slate-400">{v.sample.date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-semibold">
                    {v.sample.home} vs {v.sample.away}
                  </td>
                  <td className="px-4 py-3"><Cell m={v.espn} /></td>
                  <td className="px-4 py-3"><Cell m={v.tsdb} /></td>
                  <td className="px-4 py-3">
                    {!both ? (
                      <span className="text-slate-400">1 source</span>
                    ) : agree ? (
                      <span className="font-semibold text-yes">✓ agree</span>
                    ) : (
                      <span className="font-semibold text-no">⚠ disagree</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {slug ? (
                      <Link href={`/markets/${slug}`} className="text-accent hover:underline">
                        ✓ market
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {allRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                  No finished matches reported by either source yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", highlight && "text-no")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-red-600">{sub}</p>}
    </div>
  );
}
