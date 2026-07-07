"use client";

import { flag } from "@/lib/flags";
import { CountryLink } from "@/components/CountryLink";
import { FitToWidth } from "@/components/FitToWidth";
import { useBracketScore, type ScoreMap } from "@/components/bracketShared";
import { cn } from "@/lib/utils";

// "Bracket by Circle" view: the whole knockout drawn radially — 32 R32 teams on
// the outer ring, connectors spiralling inward through R16/QF/SF to the trophy at
// the center. Outer ring carries flags + names + live/final scores; inner rounds
// are connector dots (like the viral design). Pure-geometry layout computed once.

// feeder tree: R16←R32-matches, QF←R16, SF←QF, Final←SF
const CHILDREN: Record<number, [number, number]> = {
  104: [101, 102], 101: [97, 98], 102: [99, 100],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
};
function children(id: number | string): (number | string)[] | null {
  if (typeof id === "number") {
    if (CHILDREN[id]) return CHILDREN[id];
    if (id >= 73 && id <= 88) return [`${id}a`, `${id}b`];
  }
  return null;
}
function radiusOf(id: number | string): number {
  if (typeof id === "string") return 300;
  if (id >= 73 && id <= 88) return 244;
  if (id >= 89 && id <= 96) return 186;
  if (id >= 97 && id <= 100) return 128;
  if (id >= 101 && id <= 102) return 68;
  return 0;
}

const CX = 470, CY = 470, SIZE = 940, LEAF_R = 300;
const toRad = (d: number) => (d * Math.PI) / 180;

// --- static geometry (depends only on the bracket structure) ---
const leaves: string[] = [];
(function io(id: number | string) {
  const ch = children(id);
  if (!ch) { leaves.push(id as string); return; }
  io(ch[0]); io(ch[1]);
})(104);

const ANG: Record<string, number> = {};
leaves.forEach((s, i) => (ANG[s] = i * (360 / 32) - 90));
(function ang(id: number | string): number {
  if (ANG[String(id)] != null) return ANG[String(id)];
  const ch = children(id)!;
  return (ANG[String(id)] = (ang(ch[0]) + ang(ch[1])) / 2);
})(104);

const posOf = (id: number | string) => {
  const r = radiusOf(id), a = toRad(ANG[String(id)]);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};

const INTERNAL: (number | string)[] = [104, 101, 102, 97, 98, 99, 100, 89, 90, 91, 92, 93, 94, 95, 96, ...Array.from({ length: 16 }, (_, i) => 73 + i)];
const CONNECTORS: string[] = [];
const DOTS: { x: number; y: number }[] = [];
for (const id of INTERNAL) {
  const ch = children(id);
  if (!ch) continue;
  const pp = posOf(id), pr = radiusOf(id);
  if (id !== 104) DOTS.push(pp);
  for (const c of ch) {
    const cp = posOf(c), ca = toRad(ANG[String(c)]);
    const mid = { x: CX + pr * Math.cos(ca), y: CY + pr * Math.sin(ca) };
    CONNECTORS.push(`M${cp.x.toFixed(1)},${cp.y.toFixed(1)} L${mid.x.toFixed(1)},${mid.y.toFixed(1)} L${pp.x.toFixed(1)},${pp.y.toFixed(1)}`);
  }
}

/** One outer-ring team node: flag badge (green when decided / red-pulse when live)
 *  + score badge + radially-rotated clickable name. */
function TeamNode({ slot, team, goals, won, live }: { slot: string; team?: string; goals: number | null; won: boolean; live: boolean }) {
  const a = ANG[slot];
  const p = posOf(slot);
  const hasScore = goals != null;
  const sp = { x: CX + (LEAF_R - 22) * Math.cos(toRad(a)), y: CY + (LEAF_R - 22) * Math.sin(toRad(a)) };
  // Anchor the name by its INNER edge just outside the flag so it grows strictly
  // outward (never into the badge). Left-half labels flip 180° to stay upright.
  const lp = { x: CX + (LEAF_R + 22) * Math.cos(toRad(a)), y: CY + (LEAF_R + 22) * Math.sin(toRad(a)) };
  const rightSide = Math.cos(toRad(a)) >= 0;
  const nameTransform = rightSide
    ? `translateY(-50%) rotate(${a}deg)`
    : `translate(-100%, -50%) rotate(${a + 180}deg)`;
  return (
    <>
      <div
        className={cn(
          "absolute flex h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white text-[18px] shadow",
          live ? "animate-pulse border-red-500" : hasScore ? "border-emerald-500" : "border-slate-300"
        )}
        style={{ left: p.x, top: p.y }}
      >
        {team ? flag(team) : "·"}
      </div>
      {hasScore && (
        <div
          className="absolute flex h-[15px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 px-[3px] text-[10px] font-bold text-white"
          style={{ left: sp.x, top: sp.y }}
        >
          {goals}
        </div>
      )}
      {team && (
        <div
          className={cn("absolute whitespace-nowrap text-[11px]", hasScore && !won ? "font-medium text-slate-400" : "font-bold text-slate-900")}
          style={{ left: lp.x, top: lp.y, transform: nameTransform, transformOrigin: rightSide ? "left center" : "right center" }}
        >
          <CountryLink name={team} />
        </div>
      )}
    </>
  );
}

function CircleMatch({ num, teams, scores }: { num: number; teams: Record<string, string>; scores: ScoreMap }) {
  const ta = teams[`${num}a`];
  const tb = teams[`${num}b`];
  const { aGoals, bGoals, isLive, hasScore } = useBracketScore(ta, tb, scores);
  return (
    <>
      <TeamNode slot={`${num}a`} team={ta} goals={aGoals} won={hasScore && aGoals! > bGoals!} live={isLive} />
      <TeamNode slot={`${num}b`} team={tb} goals={bGoals} won={hasScore && bGoals! > aGoals!} live={isLive} />
    </>
  );
}

/** One inner-round advancement flag (R16→Final): the team's flag on the branch
 *  midway to its feeder, PLUS a score badge for that round's match — same
 *  live/final logic as the outer ring (green when decided, red-pulse when live,
 *  loser dimmed). The score badge sits just OUTSIDE the flag (away from the
 *  trophy) so it never collides with the connectors/center. */
function InnerNode({ x, y, team, goals, won, live }: { x: number; y: number; team: string; goals: number | null; won: boolean; live: boolean }) {
  const hasScore = goals != null;
  const dx = x - CX, dy = y - CY;
  const len = Math.hypot(dx, dy) || 1;
  const sx = x + (dx / len) * 16, sy = y + (dy / len) * 16;
  return (
    <>
      <div
        className={cn(
          "absolute flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white text-[13px] shadow",
          live ? "animate-pulse border-red-500" : hasScore ? "border-emerald-500" : "border-sky-400",
          hasScore && !won && "opacity-50"
        )}
        style={{ left: x, top: y }}
        title={team}
      >
        {flag(team)}
      </div>
      {hasScore && (
        <div
          className="absolute flex h-[15px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 px-[3px] text-[10px] font-bold text-white"
          style={{ left: sx, top: sy }}
        >
          {goals}
        </div>
      )}
    </>
  );
}

/** An inner-round match (R16 89–96, QF 97–100, SF 101–102, Final 104): both
 *  participants shown as InnerNodes with that match's score. Uses the SAME
 *  useBracketScore + `scores` feed as the FIFA bracket, so scores fill in and
 *  update live as each round is decided. */
function InnerMatch({ id, teams, scores }: { id: number; teams: Record<string, string>; scores: ScoreMap }) {
  const ch = CHILDREN[id];
  const ta = teams[`${id}a`];
  const tb = teams[`${id}b`];
  const { aGoals, bGoals, isLive, hasScore } = useBracketScore(ta, tb, scores);
  if (!ch) return null;
  const pp = posOf(id);
  const sides = [
    { team: ta, goals: aGoals, won: hasScore && aGoals! > bGoals!, child: ch[0] },
    { team: tb, goals: bGoals, won: hasScore && bGoals! > aGoals!, child: ch[1] },
  ];
  return (
    <>
      {sides.map((s, i) => {
        if (!s.team) return null;
        const cp = posOf(s.child);
        const x = pp.x + (cp.x - pp.x) * 0.5;
        const y = pp.y + (cp.y - pp.y) * 0.5;
        return <InnerNode key={i} x={x} y={y} team={s.team} goals={s.goals} won={s.won} live={isLive} />;
      })}
    </>
  );
}

export function BracketCircle({ teams, scores }: { teams: Record<string, string>; scores: ScoreMap }) {
  return (
    <FitToWidth className="pb-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="absolute left-0 top-0">
          {CONNECTORS.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#9aa3af" strokeWidth={1.3} />
          ))}
          {DOTS.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.6} fill="#6b7280" />
          ))}
        </svg>
        <div className="absolute -translate-x-1/2 -translate-y-1/2 text-[40px]" style={{ left: CX, top: CY }}>
          🏆
        </div>
        {Array.from({ length: 16 }, (_, i) => 73 + i).map((num) => (
          <CircleMatch key={num} num={num} teams={teams} scores={scores} />
        ))}
        {/* Advancement flags for the inner rounds (R16→Final): each team's flag on
            the branch (midway between the round node and the feeder it came from),
            so wins visibly move one branch inward toward the trophy — now WITH that
            round's score, filled/updated live via the same feed as the FIFA bracket. */}
        {([104, 101, 102, 97, 98, 99, 100, 89, 90, 91, 92, 93, 94, 95, 96] as const).map((id) => (
          <InnerMatch key={id} id={id} teams={teams} scores={scores} />
        ))}
      </div>
    </FitToWidth>
  );
}
