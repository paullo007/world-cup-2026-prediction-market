/**
 * The single live-update window shared by every real-time surface — the
 * Matches / Scores / Standings tabs (via LiveScoreProvider) and the Bracket
 * (BracketLive). Centralised here so they can never drift apart.
 *
 * Polling runs only when BOTH (evaluated in Singapore time, UTC+8, no DST):
 *  - the Singapore wall-clock hour is within 00:00–15:00 — the daily match
 *    window, and
 *  - the Singapore date is on or before July 20, 2026 — the last game (the
 *    July 19 final) falls on July 20 SGT, so everything hard-stops after it.
 */
export function inLiveWindow(now: Date = new Date()): boolean {
  // Shift into Singapore time, then read the wall-clock fields off UTC getters.
  const sgt = new Date(now.getTime() + 8 * 3_600_000);
  const y = sgt.getUTCFullYear();
  const m = sgt.getUTCMonth(); // 0-based; June = 5, July = 6
  const d = sgt.getUTCDate();

  // Hard-stop after July 20, 2026 (SGT) — tournament over.
  const afterTournament = y > 2026 || (y === 2026 && (m > 6 || (m === 6 && d > 20)));
  if (afterTournament) return false;

  const sgtHour = sgt.getUTCHours();
  return sgtHour >= 0 && sgtHour < 15;
}
