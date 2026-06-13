import { BRACKET, THIRD_PLACE, type BracketMatch } from "@/lib/bracket";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Compact nominal date with weekday ("2026-06-28" → "Jun28/Sun"); parsed by
// parts and resolved in UTC to avoid TZ drift.
function shortDate(ymd: string) {
  const [y, mo, d] = ymd.split("-").map(Number);
  const dow = DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${MONTHS[mo - 1]}${d}/${dow}`;
}

// Festival palette: a vibrant signature color per round, cool (early) → warm
// (Final), used for each box's top bar, the round header, and the CSS
// connectors so the whole bracket reads as a colorful, building-to-the-final
// party. Classes are full literals so Tailwind's JIT keeps them.
type Theme = {
  topBar: string; // thick colored cap on the box
  border: string; // box border tint
  hoverBorder: string; // border on hover
  afterLine: string; // → connector stub color
  beforeLine: string; // ⌐ feeder-join color
  header: string; // round title color
};
const THEMES: Record<string, Theme> = {
  r32: {
    topBar: "border-t-4 border-t-emerald-500",
    border: "border-emerald-300",
    hoverBorder: "hover:border-emerald-500",
    afterLine: "after:border-emerald-400",
    beforeLine: "before:border-emerald-400",
    header: "text-emerald-600",
  },
  r16: {
    topBar: "border-t-4 border-t-sky-500",
    border: "border-sky-300",
    hoverBorder: "hover:border-sky-500",
    afterLine: "after:border-sky-400",
    beforeLine: "before:border-sky-400",
    header: "text-sky-600",
  },
  qf: {
    topBar: "border-t-4 border-t-violet-500",
    border: "border-violet-300",
    hoverBorder: "hover:border-violet-500",
    afterLine: "after:border-violet-400",
    beforeLine: "before:border-violet-400",
    header: "text-violet-600",
  },
  sf: {
    topBar: "border-t-4 border-t-orange-500",
    border: "border-orange-300",
    hoverBorder: "hover:border-orange-500",
    afterLine: "after:border-orange-400",
    beforeLine: "before:border-orange-400",
    header: "text-orange-600",
  },
  final: {
    topBar: "border-t-4 border-t-amber-400",
    border: "border-amber-300",
    hoverBorder: "hover:border-amber-500",
    afterLine: "after:border-amber-400",
    beforeLine: "before:border-amber-400",
    header: "text-amber-500",
  },
};
const FALLBACK: Theme = THEMES.r32;

function Slot({ label, team }: { label: string; team?: string }) {
  return (
    <div className="flex items-center gap-1.5 truncate">
      {team ? (
        <>
          <span className="shrink-0 text-lg leading-none">{flag(team)}</span>
          <span className="truncate font-bold">{team}</span>
        </>
      ) : (
        <span className="truncate font-bold text-slate-400">{label}</span>
      )}
    </div>
  );
}

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
        // Vertical padding opens a clear gap between the tightly-stacked boxes
        // (esp. the 16-box Round of 32). Applied uniformly to every cell so the
        // connector fractions (top-1/4 / 1/2 / bottom-1/4) stay aligned.
        "relative flex flex-1 items-center py-3",
        !isLast &&
          cn(
            "after:absolute after:left-full after:top-1/2 after:w-8 after:border-t-2 after:content-['']",
            theme.afterLine
          ),
        !isFirst &&
          cn(
            "before:absolute before:bottom-1/4 before:right-full before:top-1/4 before:border-r-2 before:content-['']",
            theme.beforeLine
          )
      )}
    >
      <div
        className={cn(
          "group relative w-full rounded-xl border px-3 pb-2 pt-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
          theme.topBar,
          theme.border,
          theme.hoverBorder,
          emphasis
            ? "bg-gradient-to-br from-amber-50 to-white ring-1 ring-amber-300"
            : "bg-gradient-to-br from-surface-raised to-surface"
        )}
      >
        <Slot label={m.a.label} team={a} />
        <div className="my-1 h-px bg-slate-200" />
        <Slot label={m.b.label} team={b} />
        <div className="mt-1 text-[10px] font-bold text-slate-400">{shortDate(m.date)}</div>

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
        {BRACKET.map((round, ri) => {
          const theme = THEMES[round.key] ?? FALLBACK;
          const isFinal = round.key === "final";
          return (
            <div key={round.key} className="flex flex-1 flex-col">
              <div className="mb-3 text-center">
                <div className={cn("text-sm font-bold", theme.header)}>
                  {isFinal ? "🏆 " : ""}
                  {round.name}
                </div>
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
                    theme={theme}
                    emphasis={isFinal}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 max-w-xs">
        <div className="mb-2 text-sm font-bold text-rose-500">🥉 Third-place play-off</div>
        <div className="group relative rounded-xl border border-rose-300 border-t-4 border-t-rose-500 bg-gradient-to-br from-surface-raised to-surface px-3 pb-2 pt-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:border-rose-500">
          <Slot label={THIRD_PLACE.a.label} team={teamFor(`${THIRD_PLACE.num}a`) ?? THIRD_PLACE.a.team} />
          <div className="my-1 h-px bg-slate-200" />
          <Slot label={THIRD_PLACE.b.label} team={teamFor(`${THIRD_PLACE.num}b`) ?? THIRD_PLACE.b.team} />
          <div className="mt-1 text-[10px] font-bold text-slate-400">
            {shortDate(THIRD_PLACE.date)} · {THIRD_PLACE.venue.stadium}, {THIRD_PLACE.venue.city}
          </div>
        </div>
      </div>
    </div>
  );
}
