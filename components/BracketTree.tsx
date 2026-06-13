"use client";

import { useEffect, useRef, useState } from "react";
import { BRACKET, THIRD_PLACE, type BracketMatch } from "@/lib/bracket";
import { flag } from "@/lib/flags";
import { MatchStartTime } from "@/components/MatchStartTime";

// Feeder topology, parsed from the slot labels ("Winner 74" ⇒ match 74 feeds
// this slot). Used to draw a connector from each feeder box to the slot it
// advances into.
const CONNECTIONS: { from: number; to: number; slot: "a" | "b" }[] = [];
for (const round of BRACKET) {
  for (const m of round.matches) {
    (["a", "b"] as const).forEach((slot) => {
      const fed = m[slot].label.match(/Winner (\d+)/);
      if (fed) CONNECTIONS.push({ from: Number(fed[1]), to: m.num, slot });
    });
  }
}

function SlotRow({
  label,
  team,
  slotId,
}: {
  label: string;
  team?: string;
  slotId: string;
}) {
  return (
    <div data-slot={slotId} className="flex items-center gap-1.5 truncate">
      {team ? (
        <>
          <span>{flag(team)}</span>
          <span className="truncate font-semibold">{team}</span>
        </>
      ) : (
        <span className="truncate font-medium text-slate-400">{label}</span>
      )}
    </div>
  );
}

function MatchBox({
  m,
  teamFor,
}: {
  m: BracketMatch;
  teamFor: (key: string) => string | undefined;
}) {
  const a = teamFor(`${m.num}a`) ?? m.a.team;
  const b = teamFor(`${m.num}b`) ?? m.b.team;
  return (
    <div
      data-match={m.num}
      className="rounded-xl border border-accent/20 bg-gradient-to-br from-surface-raised to-surface px-3 py-2 text-sm shadow-sm transition hover:border-accent/60"
    >
      <div className="space-y-1">
        <SlotRow label={m.a.label} team={a} slotId={`${m.num}a`} />
        <div className="h-px bg-accent/15" />
        <SlotRow label={m.b.label} team={b} slotId={`${m.num}b`} />
      </div>
      <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight text-slate-400">
        <MatchStartTime iso={m.kickoff} />
        <div>
          {m.venue.stadium}, {m.venue.city}
        </div>
      </div>
    </div>
  );
}

export function BracketTree({ teams }: { teams: Record<string, string> }) {
  const teamFor = (key: string) => teams[key];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const draw = () => {
      const base = wrap.getBoundingClientRect();
      const next: string[] = [];
      for (const c of CONNECTIONS) {
        const fromEl = wrap.querySelector(`[data-match="${c.from}"]`);
        const toEl = wrap.querySelector(`[data-slot="${c.to}${c.slot}"]`);
        if (!fromEl || !toEl) continue;
        const f = fromEl.getBoundingClientRect();
        const t = toEl.getBoundingClientRect();
        const x1 = f.right - base.left;
        const y1 = f.top - base.top + f.height / 2;
        const x2 = t.left - base.left;
        const y2 = t.top - base.top + t.height / 2;
        const mx = (x1 + x2) / 2;
        next.push(`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
      }
      setPaths(next);
      setSize({ w: wrap.scrollWidth, h: wrap.scrollHeight });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [teams]);

  return (
    <div className="overflow-x-auto pb-4">
      <div ref={wrapRef} className="relative min-w-[1000px]">
        <svg
          className="pointer-events-none absolute left-0 top-0 text-accent"
          width={size.w}
          height={size.h}
          fill="none"
        >
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="currentColor"
              strokeOpacity={0.5}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="relative z-10 flex items-stretch gap-4">
          {BRACKET.map((round) => (
            <div key={round.key} className="flex flex-1 flex-col">
              <div className="mb-3 text-center">
                <div className="text-sm font-bold text-accent">{round.name}</div>
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

      <div className="mt-8 max-w-xs">
        <div className="mb-2 text-sm font-bold text-accent">Third-place play-off</div>
        <MatchBox m={THIRD_PLACE} teamFor={teamFor} />
      </div>
    </div>
  );
}
