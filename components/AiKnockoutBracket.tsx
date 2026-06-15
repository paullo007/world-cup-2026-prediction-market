import { AI_BRACKET, AI_CHAMPION, predWinner, type PredMatch } from "@/lib/aiKnockouts";
import { BRACKET } from "@/lib/bracket";
import type { Venue } from "@/lib/venues";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";
import { FitToWidth } from "@/components/FitToWidth";
import { StickyUnderNav } from "@/components/StickyUnderNav";
import { cn } from "@/lib/utils";

// Borrow the real knockout schedule (same round keys + match counts) so each
// predicted box can show a real kickoff time + venue on hover.
const SCHEDULE: Record<string, { kickoff: string; venue: Venue }[]> = Object.fromEntries(
  BRACKET.map((r) => [r.key, r.matches.map((m) => ({ kickoff: m.kickoff, venue: m.venue }))])
);

// Per-round festival palette, cool → warm toward the Final (mirrors the Bracket
// tab). Full literal classes so Tailwind's JIT keeps them.
type Theme = { topBar: string; border: string; line: string; header: string };
const THEMES: Record<string, Theme> = {
  r32: { topBar: "border-t-4 border-t-emerald-500", border: "border-emerald-300", line: "border-emerald-400", header: "text-emerald-600" },
  r16: { topBar: "border-t-4 border-t-sky-500", border: "border-sky-300", line: "border-sky-400", header: "text-sky-600" },
  qf: { topBar: "border-t-4 border-t-violet-500", border: "border-violet-300", line: "border-violet-400", header: "text-violet-600" },
  sf: { topBar: "border-t-4 border-t-orange-500", border: "border-orange-300", line: "border-orange-400", header: "text-orange-600" },
  final: { topBar: "border-t-4 border-t-amber-400", border: "border-amber-300", line: "border-amber-400", header: "text-amber-500" },
};
const AFTER: Record<string, string> = {
  r32: "after:border-emerald-400", r16: "after:border-sky-400", qf: "after:border-violet-400",
  sf: "after:border-orange-400", final: "after:border-amber-400",
};
const BEFORE: Record<string, string> = {
  r16: "before:border-sky-400", qf: "before:border-violet-400", sf: "before:border-orange-400",
  final: "before:border-amber-400",
};

function TeamRow({ team, score, won }: { team: string; score: number; won: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", won ? "text-slate-100" : "text-slate-400")}>
      <span className="shrink-0 text-[1.5em] leading-none">{flag(team)}</span>
      <span className={cn("flex-1 truncate", won ? "font-extrabold" : "font-semibold")}>{team}</span>
      <span className={cn("shrink-0 tabular-nums", won ? "font-extrabold text-accent" : "font-bold")}>{score}</span>
    </div>
  );
}

function MatchCell({
  m,
  roundKey,
  isFirst,
  meta,
}: {
  m: PredMatch;
  roundKey: string;
  isFirst: boolean;
  meta?: { kickoff: string; venue: Venue };
}) {
  const theme = THEMES[roundKey];
  const w = predWinner(m);
  return (
    <div
      className={cn(
        "relative flex flex-1 items-center py-3",
        "after:absolute after:left-full after:top-1/2 after:w-8 after:border-t-2 after:content-['']",
        AFTER[roundKey],
        !isFirst &&
          cn(
            "before:absolute before:bottom-1/4 before:right-full before:top-1/4 before:border-r-2 before:content-['']",
            BEFORE[roundKey]
          )
      )}
    >
      <div
        className={cn(
          "group relative w-full rounded-xl border bg-gradient-to-br from-surface-raised to-surface px-3 pb-2 pt-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
          theme.topBar,
          theme.border
        )}
      >
        <TeamRow team={m.a.team} score={m.a.score} won={w.team === m.a.team} />
        <div className="my-1 h-px bg-slate-200" />
        <TeamRow team={m.b.team} score={m.b.score} won={w.team === m.b.team} />

        {/* Kickoff (in the viewer's local time) + venue on hover. */}
        {meta && (
          <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-[11px] leading-snug text-slate-300 shadow-lg group-hover:block">
            <div className="font-semibold text-slate-200">
              <MatchStartTime iso={meta.kickoff} />
            </div>
            <div>
              {meta.venue.stadium}, {meta.venue.city}, {meta.venue.country}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// One column header cell. Shared structure (flex-1) keeps the sticky label row
// aligned with the body columns below it.
function RoundLabel({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-1 items-end justify-center pb-2 pt-1 text-center">
      <div className={cn("text-sm font-bold", className)}>{name}</div>
    </div>
  );
}

export function AiKnockoutBracket() {
  return (
    <>
      {/* Round labels: pinned just under the global nav while the bracket scrolls.
          Its own FitToWidth scales it identically to the body (same width/columns),
          so the labels stay over their columns. Lives outside the body's transform,
          so `position: sticky` works. */}
      <StickyUnderNav className="border-b border-surface-border bg-surface">
        <div className="flex w-[1180px] items-stretch gap-8 pr-2">
          {AI_BRACKET.map((round) => (
            <RoundLabel key={round.key} name={round.name} className={THEMES[round.key].header} />
          ))}
          <RoundLabel name="🏆 Champion" className="text-amber-500" />
        </div>
      </StickyUnderNav>

      {/* Bracket body — headers now live in the sticky bar above. */}
      <FitToWidth className="pb-4">
        {/* Fixed design width; FitToWidth scales the whole tree (Champion included)
            down to fit any screen, falling back to scroll only on very small ones. */}
        <div className="flex w-[1180px] items-stretch gap-8 pr-2 pt-3">
          {AI_BRACKET.map((round) => (
            <div key={round.key} className="flex flex-1 flex-col">
              {round.matches.map((m, i) => (
                <MatchCell
                  key={i}
                  m={m}
                  roundKey={round.key}
                  isFirst={round.key === "r32"}
                  meta={SCHEDULE[round.key]?.[i]}
                />
              ))}
            </div>
          ))}

          {/* Champion column — receives the Final's connector stub. */}
          <div className="flex flex-1 flex-col">
            <div className="relative flex flex-1 items-center">
              <div className="w-full rounded-xl border border-amber-300 border-t-4 border-t-amber-400 bg-gradient-to-br from-amber-50 to-white px-4 py-5 text-center shadow-md ring-1 ring-amber-300">
                <div className="text-5xl leading-none">{flag(AI_CHAMPION)}</div>
                <div className="mt-2 text-xl font-extrabold">{AI_CHAMPION}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                  Predicted Champion
                </div>
              </div>
            </div>
          </div>
        </div>
      </FitToWidth>
    </>
  );
}
