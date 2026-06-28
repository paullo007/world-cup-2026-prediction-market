"use client";

import { bracketByDate, THIRD_PLACE, type BracketMatch } from "@/lib/bracket";
import { MatchStartTime } from "@/components/MatchStartTime";
import { FitToWidth } from "@/components/FitToWidth";
import { BRACKET_W, THEMES, FALLBACK, Slot, BoxDate, type Theme } from "@/components/bracketShared";
import { cn } from "@/lib/utils";

// "Bracket by FIFA" view: the full connected knockout tree, ordered by date so the
// first-played match sits on top (still a valid tree — feeders stay across from
// their match, so the CSS connector elbows line up). Round labels + the view
// toggle live in the sticky bar provided by BracketLive.

/**
 * One match cell. The cell flexes to an equal share of its column's height, so a
 * round-N+1 cell spans exactly its two round-N feeders. Connectors are pure CSS
 * borders living in the gutter between columns (no SVG); their color comes from
 * the round `theme`. `emphasis` gives the Final a gold, celebratory box.
 */
function MatchCell({
  m,
  teamFor,
  isFirst,
  isLast,
  theme,
  emphasis,
}: {
  m: BracketMatch;
  teamFor: (key: string) => string | undefined;
  isFirst: boolean;
  isLast: boolean;
  theme: Theme;
  emphasis?: boolean;
}) {
  const a = teamFor(`${m.num}a`) ?? m.a.team;
  const b = teamFor(`${m.num}b`) ?? m.b.team;
  return (
    <div
      className={cn(
        "relative flex flex-1 items-center py-3",
        !isLast &&
          cn("after:absolute after:left-full after:top-1/2 after:w-8 after:border-t-2 after:content-['']", theme.afterLine),
        !isFirst &&
          cn("before:absolute before:bottom-1/4 before:right-full before:top-1/4 before:border-r-2 before:content-['']", theme.beforeLine)
      )}
    >
      <div
        className={cn(
          "group relative w-full rounded-xl border px-3 pb-2 pt-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
          theme.topBar,
          theme.border,
          theme.hoverBorder,
          emphasis ? "bg-gradient-to-br from-amber-50 to-white ring-1 ring-amber-300" : "bg-gradient-to-br from-surface-raised to-surface"
        )}
      >
        <Slot label={m.a.label} team={a} />
        <div className="my-1 h-px bg-slate-200" />
        <Slot label={m.b.label} team={b} />
        <div className="mt-1 text-[10px] font-bold text-slate-400">
          <BoxDate date={m.date} kickoff={m.kickoff} num={m.num} />
        </div>

        {/* Time + venue on hover, so the boxes stay compact. */}
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-[11px] leading-snug text-slate-300 shadow-lg group-hover:block">
          <div className="font-semibold text-slate-200">
            <MatchStartTime iso={m.kickoff} />
          </div>
          <div>
            {m.venue.stadium}, {m.venue.city}, {m.venue.country}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BracketTree({ teams }: { teams: Record<string, string> }) {
  const teamFor = (key: string) => teams[key];
  const rounds = bracketByDate();
  const lastIndex = rounds.length - 1;

  return (
    <div>
      <FitToWidth className="pb-4">
        <div className={cn("flex items-stretch gap-8 pt-3", BRACKET_W)}>
          {rounds.map((round, ri) => {
            const theme = THEMES[round.key] ?? FALLBACK;
            const isFinal = round.key === "final";
            return (
              <div key={round.key} className="flex flex-1 flex-col">
                {round.matches.map((m) => (
                  <MatchCell
                    key={m.num}
                    m={m}
                    teamFor={teamFor}
                    isFirst={ri === 0}
                    isLast={ri === lastIndex}
                    theme={theme}
                    emphasis={isFinal}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </FitToWidth>

      <div className="mt-8 max-w-xs">
        <div className="mb-2 text-sm font-bold text-rose-500">🥉 Third-place play-off</div>
        <div className="group relative rounded-xl border border-rose-300 border-t-4 border-t-rose-500 bg-gradient-to-br from-surface-raised to-surface px-3 pb-2 pt-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:border-rose-500">
          <Slot label={THIRD_PLACE.a.label} team={teamFor(`${THIRD_PLACE.num}a`) ?? THIRD_PLACE.a.team} />
          <div className="my-1 h-px bg-slate-200" />
          <Slot label={THIRD_PLACE.b.label} team={teamFor(`${THIRD_PLACE.num}b`) ?? THIRD_PLACE.b.team} />
          <div className="mt-1 text-[10px] font-bold text-slate-400">
            <BoxDate date={THIRD_PLACE.date} kickoff={THIRD_PLACE.kickoff} num={THIRD_PLACE.num} /> · {THIRD_PLACE.venue.stadium}, {THIRD_PLACE.venue.city}
          </div>
        </div>
      </div>
    </div>
  );
}
