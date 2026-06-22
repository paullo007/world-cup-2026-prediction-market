import { getPlayedMatches } from "@/lib/playedMatches";
import { getCountry, goalsForRoster, assistsForRoster, resultsForCountry } from "@/lib/countries";
import { CountryDetail } from "@/components/CountryDetail";

export const dynamic = "force-dynamic";

export default async function BrazilPage() {
  const data = getCountry("Brazil")!;
  const played = await getPlayedMatches();
  const goals = goalsForRoster(data.roster, played, "Brazil");
  const assists = assistsForRoster(data.roster, played, "Brazil");
  const results = resultsForCountry(data.matches, played, "Brazil");
  return <CountryDetail data={data} goals={goals} assists={assists} results={results} />;
}
