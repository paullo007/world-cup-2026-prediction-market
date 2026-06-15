import { getPlayedMatches } from "@/lib/playedMatches";
import { getCountry, goalsForRoster } from "@/lib/countries";
import { CountryDetail } from "@/components/CountryDetail";

export const dynamic = "force-dynamic";

export default async function BrazilPage() {
  const data = getCountry("Brazil")!;
  const played = await getPlayedMatches();
  const goals = goalsForRoster(data.roster, played, "Brazil");
  return <CountryDetail data={data} goals={goals} />;
}
