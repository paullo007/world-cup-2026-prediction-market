"use client";

import { useEffect, useState } from "react";

/**
 * Renders a match kickoff (given as a UTC ISO string) in the VIEWER's local
 * time, e.g. "Start Time: 3:00am Singapore (UTC+8), Jun23.26".
 * Client-only (depends on the browser timezone); renders nothing until mounted
 * to avoid a hydration mismatch.
 */
export function MatchStartTime({ iso }: { iso: string }) {
  // Split into the kickoff time (highlighted) and the rest of the line.
  const [parts, setParts] = useState<{ time: string; rest: string } | null>(null);

  useEffect(() => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return;

    let time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    time = time.replace(/\s?AM$/i, "am").replace(/\s?PM$/i, "pm");

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const city = tz.split("/").pop()!.replace(/_/g, " ");

    const offMin = -d.getTimezoneOffset();
    const sign = offMin >= 0 ? "+" : "-";
    const oh = Math.floor(Math.abs(offMin) / 60);
    const om = Math.abs(offMin) % 60;
    const offset = `UTC${sign}${oh}${om ? ":" + String(om).padStart(2, "0") : ""}`;

    const mon = d.toLocaleString("en-US", { month: "short" });
    const yy = String(d.getFullYear()).slice(-2);
    const wd = d.toLocaleDateString("en-US", { weekday: "short" });
    const date = `${mon}${d.getDate()}.${yy}/${wd}`;

    setParts({ time, rest: ` ${city} (${offset}), ${date}` });
  }, [iso]);

  if (!parts) return null;
  return (
    <span>
      Start Time: <strong className="text-[1.15em] font-bold">{parts.time}</strong>
      {parts.rest}
    </span>
  );
}
