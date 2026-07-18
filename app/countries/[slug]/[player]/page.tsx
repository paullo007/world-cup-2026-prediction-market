import { notFound } from "next/navigation";
import { getAllPlayedMatches } from "@/lib/playedMatches";
import {
  getCountry,
  countryFromSlug,
  findPlayerBySlug,
  goalsForRoster,
  assistsForRoster,
} from "@/lib/countries";
import { PlayerDetail } from "@/components/PlayerDetail";
import { LiveScoreProvider } from "@/components/LiveScoreProvider";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
}: {
  params: { slug: string; player: string };
}) {
  const name = countryFromSlug(params.slug);
  if (!name) notFound();
  const data = getCountry(name)!;
  const player = findPlayerBySlug(data.roster, params.player);
  if (!player) notFound();

  const played = await getAllPlayedMatches();
  const goals = goalsForRoster(data.roster, played, name)[player.name] ?? 0;
  const assists = assistsForRoster(data.roster, played, name)[player.name] ?? 0;
  // Both key orientations so a live-feed match already resolved (but still
  // showing "post" on ESPN's own scoreboard) is never double-counted live.
  const playedKeys = played.flatMap((m) => [`${m.home} vs ${m.away}`, `${m.away} vs ${m.home}`]);

  return (
    <LiveScoreProvider>
      <PlayerDetail player={player} country={name} goals={goals} assists={assists} playedKeys={playedKeys} />
    </LiveScoreProvider>
  );
}
