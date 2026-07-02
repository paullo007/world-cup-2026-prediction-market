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

  return <PlayerDetail player={player} country={name} goals={goals} assists={assists} />;
}
