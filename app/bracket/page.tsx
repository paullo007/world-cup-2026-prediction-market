import Link from "next/link";
import { db } from "@/lib/db";
import { BRACKET, THIRD_PLACE, type BracketMatch, type Slot } from "@/lib/bracket";
import { flag } from "@/lib/flags";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function SlotRow({ label, team }: { label: string; team?: string }) {
  if (team) {
    return (
      <div className="flex items-center gap-1.5 truncate font-semibold">
        <span>{flag(team)}</span>
        <span className="truncate">{team}</span>
      </div>
    );
  }
  return <div className="truncate text-slate-400">{label}</div>;
}

function MatchBox({ m, teamFor }: { m: BracketMatch; teamFor: (key: string) => string | undefined }) {
  const a = teamFor(`${m.num}a`) ?? m.a.team;
  const b = teamFor(`${m.num}b`) ?? m.b.team;
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm">
      <div className="space-y-1">
        <SlotRow label={m.a.label} team={a} />
        <div className="h-px bg-surface-border" />
        <SlotRow label={m.b.label} team={b} />
      </div>
      <div className="mt-1.5 text-[11px] text-slate-400">
        #{m.num} · {formatDate(new Date(`${m.date}T12:00:00Z`))}
      </div>
    </div>
  );
}

export default async function BracketPage() {
  const assignments = await db.bracketAssignment.findMany();
  const map = new Map(assignments.map((a) => [a.slot, a.team]));
  const teamFor = (key: string) => map.get(key);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Tournament Bracket</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          The full knockout path to the final at MetLife Stadium. Matchups fill in with
          teams as the group stage finishes (Jun 27) and each round is decided — the
          structure, dates and slots below are final. Trade who goes how far in the{" "}
          <Link href="/?category=Knockouts" className="font-semibold text-accent hover:underline">
            Knockouts
          </Link>{" "}
          tab.
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-[1000px] items-stretch gap-4">
          {BRACKET.map((round) => (
            <div key={round.key} className="flex flex-1 flex-col">
              <div className="mb-3 text-center">
                <div className="text-sm font-bold">{round.name}</div>
                <div className="text-xs text-slate-400">{round.dates}</div>
              </div>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((m) => (
                  <MatchBox key={m.num} m={m} teamFor={teamFor} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <div className="mb-2 text-sm font-bold">Third-place play-off</div>
        <MatchBox m={THIRD_PLACE} teamFor={teamFor} />
      </div>
    </div>
  );
}
