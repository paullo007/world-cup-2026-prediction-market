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
  const upright = a > 90 && a < 270 ? a + 180 : a;
  const sp = { x: CX + (LEAF_R - 22) * Math.cos(toRad(a)), y: CY + (LEAF_R - 22) * Math.sin(toRad(a)) };
  const lp = { x: CX + (LEAF_R + 30) * Math.cos(toRad(a)), y: CY + (LEAF_R + 30) * Math.sin(toRad(a)) };
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
          className={cn("absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px]", hasScore && !won ? "font-medium text-slate-400" : "font-bold text-slate-900")}
          style={{ left: lp.x, top: lp.y, transform: `translate(-50%,-50%) rotate(${upright}deg)` }}
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
      </div>
    </FitToWidth>
  );
}
