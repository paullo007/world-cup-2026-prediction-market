import type { Scorer } from "@/lib/results";
import { flag } from "@/lib/flags";

/** Sort key for a goal minute like "23'" or "45'+2'" (stoppage sorts after). */
export function minuteSort(m?: string): number {
  if (!m) return 9999; // minute unknown → list last
  const base = parseInt(m, 10) || 0;
  const extra = m.includes("+") ? parseInt(m.split("+")[1], 10) || 0 : 0;
  return base + extra / 100;
}

export const sameTeam = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * One goalscorer line: flag + player + minute, "(penalty)" / "(own goal)" after
 * the time, with any assist(s) indented in italics below ("Assist: A, B").
 */
function ScorerLine({ s, flagTeam }: { s: Scorer; flagTeam: string }) {
  return (
    <li>
      <div className="flex items-center gap-1.5">
        <span className="shrink-0">{flag(flagTeam)}</span>
        <span className="font-medium">{s.name}</span>
        <span className="text-slate-400">
          {s.minute ?? ""}
          {s.penalty ? `${s.minute ? " " : ""}(penalty)` : ""}
          {s.ownGoal ? `${s.minute ? " " : ""}(own goal)` : ""}
        </span>
      </div>
      {s.assists && s.assists.length > 0 && (
        <div className="pl-5 italic text-slate-400">Assist: {s.assists.join(", ")}</div>
      )}
    </li>
  );
}

/**
 * Two-column "Goalscorers" panel for a finished fixture: `leftTeam`'s scorers in
 * the left column, everyone else in the right. Shared by the Matches tab
 * (`MatchCard3Way`, left = fixture home) and the Countries tab (`CountryDetail`,
 * left = the viewed country) so both render identically. Renders nothing when
 * there are no scorers. Own goals show the scorer's OWN-team flag (FIFA
 * convention) even though they're placed/counted under the beneficiary side.
 */
export function GoalscorersBlock({
  scorers,
  leftTeam,
  rightTeam,
}: {
  scorers: Scorer[];
  leftTeam: string;
  rightTeam: string;
}) {
  const sorted = scorers
    .slice()
    .sort((a, b) => minuteSort(a.minute) - minuteSort(b.minute));
  if (sorted.length === 0) return null;

  const left = sorted.filter((s) => sameTeam(s.team, leftTeam));
  const right = sorted.filter((s) => !sameTeam(s.team, leftTeam));
  // Flag shown next to a scorer = the player's OWN team. For an own goal,
  // `s.team` is the side it COUNTS for (column placement), but the player
  // belongs to the other team — so show the opponent's flag.
  const flagTeamFor = (s: Scorer) =>
    s.ownGoal ? (sameTeam(s.team, leftTeam) ? rightTeam : leftTeam) : s.team;

  return (
    <div className="space-y-1 rounded-lg border border-surface-border bg-surface px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Goalscorers
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-300">
        <ul className="space-y-0.5">
          {left.map((s, i) => (
            <ScorerLine key={`l-${s.name}-${s.minute ?? i}`} s={s} flagTeam={flagTeamFor(s)} />
          ))}
        </ul>
        <ul className="space-y-0.5 border-l border-surface-border pl-3">
          {right.map((s, i) => (
            <ScorerLine key={`r-${s.name}-${s.minute ?? i}`} s={s} flagTeam={flagTeamFor(s)} />
          ))}
        </ul>
      </div>
    </div>
  );
}
