"use client";

import { useMemo } from "react";
import Link from "next/link";
import { flag } from "@/lib/flags";
import type { SluggedPlayer } from "@/lib/countries";
import { slugifyCountry, goalsForRoster, assistsForRoster } from "@/lib/countries";
import { useLiveScores } from "@/components/LiveScoreProvider";

/** Age in whole years from an ISO birth date. */
function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function fmtDob(dob?: string): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface px-4 py-3 text-center">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-surface-border py-2 text-sm first:border-t-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Player detail page body. Bio comes from ESPN, club/photo from TheSportsDB
 * (best-effort — fields are simply omitted when missing). WC2026 goals/assists
 * are computed from our own resolved-match data, overlaid with a live "+N live"
 * badge while this player's country has a match in progress (mirrors the Goals
 * tab/Squad table — display-only, never affects settlement). Deep career stats
 * aren't in the free feeds, so we link out to the player's ESPN profile.
 */
export function PlayerDetail({
  player,
  country,
  goals,
  assists,
  playedKeys = [],
}: {
  player: SluggedPlayer;
  country: string;
  goals: number;
  assists: number;
  /** "home vs away" keys (both orientations) of already-resolved matches. */
  playedKeys?: string[];
}) {
  const age = player.age ?? ageFromDob(player.dob);
  const countrySlug = slugifyCountry(country);

  const live = useLiveScores();
  const liveMatches = useMemo(() => {
    const played = new Set(playedKeys);
    return live.filter((m) => !played.has(m.matchKey));
  }, [live, playedKeys]);
  const liveGoals = useMemo(
    () => goalsForRoster([player], liveMatches, country)[player.name] ?? 0,
    [player, liveMatches, country]
  );
  const liveAssists = useMemo(
    () => assistsForRoster([player], liveMatches, country)[player.name] ?? 0,
    [player, liveMatches, country]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/countries/${countrySlug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        ← {flag(country)} {country} squad
      </Link>

      {/* Header: photo + name + key facts */}
      <div className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-surface-raised p-5 sm:flex-row sm:items-center">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt={player.name}
            className="h-28 w-28 shrink-0 rounded-full border border-surface-border bg-surface object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface text-4xl">
            {flag(player.nationality || country)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">{player.fullName || player.name}</h1>
          {player.fullName && player.fullName !== player.name && (
            <p className="text-sm text-slate-400">Known as {player.name}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
            <span>{flag(player.nationality || country)} {player.nationality || country}</span>
            <span className="text-slate-500">·</span>
            <span>{player.detailedPosition || player.position}</span>
            {player.number != null && (
              <>
                <span className="text-slate-500">·</span>
                <span>#{player.number}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* WC2026 stats (from our data) */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-600">
          2026 World Cup
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Goals"
            value={
              <>
                {goals + liveGoals}
                {liveGoals > 0 && <span className="ml-1 text-[10px] font-bold text-red-600">+{liveGoals} live</span>}
              </>
            }
          />
          <Stat
            label="Assists"
            value={
              <>
                {assists + liveAssists}
                {liveAssists > 0 && (
                  <span className="ml-1 text-[10px] font-bold text-red-600">+{liveAssists} live</span>
                )}
              </>
            }
          />
          <Stat label="G+A" value={goals + liveGoals + assists + liveAssists} />
        </div>
      </section>

      {/* Bio / profile */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-600">Profile</h2>
        <div className="divide-y divide-surface-border">
          {player.club && <Row label="Club" value={player.club} />}
          <Row label="Position" value={player.detailedPosition || player.position} />
          {player.number != null && <Row label="Squad number" value={player.number} />}
          {age != null && <Row label="Age" value={age} />}
          {fmtDob(player.dob) && <Row label="Date of birth" value={fmtDob(player.dob)} />}
          {player.birthPlace && <Row label="Birthplace" value={player.birthPlace} />}
          <Row label="Nationality" value={`${flag(player.nationality || country)} ${player.nationality || country}`} />
          {player.height && <Row label="Height" value={player.height} />}
          {player.weight && <Row label="Weight" value={player.weight} />}
        </div>

        {player.espnUrl && (
          <a
            href={player.espnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Full career stats on ESPN →
          </a>
        )}
        <p className="mt-3 text-xs italic text-slate-400">
          Bio from ESPN; club &amp; photo from TheSportsDB (best-effort). World Cup goals and assists
          are tallied from approved match results. Career totals aren&apos;t available in the free data
          feeds — see the ESPN profile for full career statistics.
        </p>
      </section>
    </div>
  );
}
