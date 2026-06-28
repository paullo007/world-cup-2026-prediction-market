"use client";

import { useEffect, useState } from "react";
import { flag } from "@/lib/flags";

// Shared bracket styling used by both views (BracketTree = "Bracket by FIFA",
// BracketSchedule = "Bracket by Date") and the sticky toggle/label bar.

export const BRACKET_W = "min-w-[1100px]"; // shared fixed width so labels align with columns

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Compact nominal date with weekday ("2026-06-28" → "Jun28/Sun"); parsed by parts
// and resolved in UTC to avoid TZ drift.
export function shortDate(ymd: string) {
  const [y, mo, d] = ymd.split("-").map(Number);
  const dow = DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${MONTHS[mo - 1]}${d}/${dow}`;
}

// Festival palette: a vibrant signature color per round, cool (early) → warm
// (Final). Classes are full literals so Tailwind's JIT keeps them.
export type Theme = {
  topBar: string;
  border: string;
  hoverBorder: string;
  afterLine: string;
  beforeLine: string;
  header: string;
};
export const THEMES: Record<string, Theme> = {
  r32: { topBar: "border-t-4 border-t-emerald-500", border: "border-emerald-300", hoverBorder: "hover:border-emerald-500", afterLine: "after:border-emerald-400", beforeLine: "before:border-emerald-400", header: "text-emerald-600" },
  r16: { topBar: "border-t-4 border-t-sky-500", border: "border-sky-300", hoverBorder: "hover:border-sky-500", afterLine: "after:border-sky-400", beforeLine: "before:border-sky-400", header: "text-sky-600" },
  qf: { topBar: "border-t-4 border-t-violet-500", border: "border-violet-300", hoverBorder: "hover:border-violet-500", afterLine: "after:border-violet-400", beforeLine: "before:border-violet-400", header: "text-violet-600" },
  sf: { topBar: "border-t-4 border-t-orange-500", border: "border-orange-300", hoverBorder: "hover:border-orange-500", afterLine: "after:border-orange-400", beforeLine: "before:border-orange-400", header: "text-orange-600" },
  final: { topBar: "border-t-4 border-t-amber-400", border: "border-amber-300", hoverBorder: "hover:border-amber-500", afterLine: "after:border-amber-400", beforeLine: "before:border-amber-400", header: "text-amber-500" },
};
export const FALLBACK: Theme = THEMES.r32;

/**
 * Bracket box date stamp: "Jun28/Sun/3:00am #73" — nominal match date + the
 * kickoff in the VIEWER's local timezone + match number. The local time is added
 * only after mount (the first client render matches the server: date + #num with
 * no time), so there's no hydration mismatch.
 */
export function BoxDate({ date, kickoff, num }: { date: string; kickoff: string; num: number }) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date(kickoff);
    if (isNaN(d.getTime())) return;
    const t = d
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s?AM$/i, "am")
      .replace(/\s?PM$/i, "pm");
    setTime(t);
  }, [kickoff]);
  return (
    <span>
      {shortDate(date)}
      {time ? (
        <>
          /<strong className="font-bold text-accent">{time}</strong>
        </>
      ) : null}{" "}
      #{num}
    </span>
  );
}

export function Slot({ label, team }: { label: string; team?: string }) {
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
