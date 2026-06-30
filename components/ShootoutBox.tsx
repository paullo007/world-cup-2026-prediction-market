import type { ShootoutKick } from "@/lib/results";
import { flag } from "@/lib/flags";
import { sameTeam } from "@/components/GoalscorersBlock";

/** One taker line: a scored ✓ (green) or missed ✗ (red) marker + player name. */
function KickLine({ k }: { k: ShootoutKick }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={k.scored ? "font-bold text-yes" : "font-bold text-no"}>{k.scored ? "✓" : "✗"}</span>
      <span className={k.scored ? "font-medium" : "text-slate-400 line-through decoration-slate-500"}>{k.player}</span>
    </li>
  );
}

function Column({ team, kicks }: { team: string; kicks: ShootoutKick[] }) {
  const scored = kicks.filter((k) => k.scored).length;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
        <span className="shrink-0">{flag(team)}</span>
        <span className="truncate">{team}</span>
        <span className="ml-auto shrink-0 tabular-nums text-slate-400">{scored}</span>
      </div>
      <ul className="space-y-0.5">
        {kicks.map((k, i) => (
          <KickLine key={`${k.player}-${i}`} k={k} />
        ))}
      </ul>
    </div>
  );
}

/**
 * "Penalty Shootout" panel for a knockout tie decided on penalties — each team's
 * takers in order, ✓ scored / ✗ missed, with the shootout score per side. Same
 * two-column layout as GoalscorersBlock; left = `leftTeam` (the fixture home, or
 * the viewed country on the Countries tab). Renders nothing without shootout data.
 */
export function ShootoutBox({
  kicks,
  leftTeam,
  rightTeam,
}: {
  kicks: ShootoutKick[];
  leftTeam: string;
  rightTeam: string;
}) {
  if (!kicks || kicks.length === 0) return null;
  const ordered = kicks.slice().sort((a, b) => a.order - b.order);
  const left = ordered.filter((k) => sameTeam(k.team, leftTeam));
  const right = ordered.filter((k) => !sameTeam(k.team, leftTeam));

  return (
    <div className="space-y-1 rounded-lg border border-surface-border bg-surface px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Penalty Shootout
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-300">
        <Column team={leftTeam} kicks={left} />
        <div className="border-l border-surface-border pl-3">
          <Column team={rightTeam} kicks={right} />
        </div>
      </div>
    </div>
  );
}
