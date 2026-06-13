import { BRACKET, THIRD_PLACE, type BracketMatch } from "@/lib/bracket";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Compact nominal date ("2026-06-29" → "Jun 29"); parsed by parts to avoid TZ drift.
function shortDate(ymd: string) {
  const [, mo, d] = ymd.split("-").map(Number);
  return `${MONTHS[mo - 1]} ${d}`;
}

function Slot({ label, team }: { label: string; team?: string }) {
  return (
    <div className="flex items-center gap-1.5 truncate">
      {team ? (
        <>
          <span className="shrink-0">{flag(team)}</span>
          <span className="truncate font-semibold">{team}</span>
        </>
      ) : (
        <span className="truncate font-medium text-slate-400">{label}</span>
      )}
    </div>
  );
}

/**
 * One match cell. The cell flexes to an equal share of its column's height, so a
 * round-N+1 cell spans exactly its two round-N feeders. Connectors are pure CSS
 * borders living in the gutter between columns (no SVG): `::after` is the
 * horizontal stub out to the next round; `::before` is the vertical line that
 * joins this cell's two incoming feeders. They line up because the cells do.
 */
function MatchCell({
  m,
  teamFor,
  isFirst,
  isLast,
}: {
  m: BracketMatch;
  teamFor: (key: string) => string | undefined;
  isFirst: boolean;
  isLast: boolean;
}) {
  const a = teamFor(`${m.num}a`) ?? m.a.team;
  const b = teamFor(`${m.num}b`) ?? m.b.team;
  return (
    <div
      className={cn(
        "relative flex flex-1 items-center",
        !isLast &&
          "after:absolute after:left-full after:top-1/2 after:w-8 after:border-t-2 after:border-accent/40 after:content-['']",
        !isFirst &&
          "before:absolute before:bottom-1/4 before:right-full before:top-1/4 before:border-r-2 before:border-accent/40 before:content-['']"
      )}
    >
      <div className="group relative w-full rounded-xl border border-accent/20 bg-gradient-to-br from-surface-raised to-surface px-3 py-2 text-sm shadow-sm transition hover:border-accent/60">
        <Slot label={m.a.label} team={a} />
        <div className="my-1 h-px bg-accent/15" />
        <Slot label={m.b.label} team={b} />
        <div className="mt-1 text-[10px] font-medium text-slate-400">{shortDate(m.date)}</div>

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
  const lastIndex = BRACKET.length - 1;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-[1100px] items-stretch gap-8">
        {BRACKET.map((round, ri) => (
          <div key={round.key} className="flex flex-1 flex-col">
            <div className="mb-3 text-center">
              <div className="text-sm font-bold text-accent">{round.name}</div>
              <div className="text-xs text-slate-400">{round.dates}</div>
            </div>
            <div className="flex flex-1 flex-col">
              {round.matches.map((m) => (
                <MatchCell
                  key={m.num}
                  m={m}
                  teamFor={teamFor}
                  isFirst={ri === 0}
                  isLast={ri === lastIndex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 max-w-xs">
        <div className="mb-2 text-sm font-bold text-accent">Third-place play-off</div>
        <div className="group relative rounded-xl border border-accent/20 bg-gradient-to-br from-surface-raised to-surface px-3 py-2 text-sm shadow-sm">
          <Slot label={THIRD_PLACE.a.label} team={teamFor(`${THIRD_PLACE.num}a`) ?? THIRD_PLACE.a.team} />
          <div className="my-1 h-px bg-accent/15" />
          <Slot label={THIRD_PLACE.b.label} team={teamFor(`${THIRD_PLACE.num}b`) ?? THIRD_PLACE.b.team} />
          <div className="mt-1 text-[10px] font-medium text-slate-400">
            {shortDate(THIRD_PLACE.date)} · {THIRD_PLACE.venue.stadium}, {THIRD_PLACE.venue.city}
          </div>
        </div>
      </div>
    </div>
  );
}
