import { getPlayedGroupMatches, getPlayedKnockoutMatches } from "@/lib/playedMatches";
import { getCountry, goalsForRoster, assistsForRoster, resultsForCountry } from "@/lib/countries";
import { knockoutsForCountry } from "@/lib/countryKnockouts";
import { buildScorerRows } from "@/lib/scorerRows";
import { CountryDetail } from "@/components/CountryDetail";

export const dynamic = "force-dynamic";

export default async function BrazilPage() {
  const data = getCountry("Brazil")!;
  const [groupPlayed, knockoutPlayed] = await Promise.all([getPlayedGroupMatches(), getPlayedKnockoutMatches()]);
  const played = [...groupPlayed, ...knockoutPlayed];
  const goals = goalsForRoster(data.roster, played, "Brazil");
  const assists = assistsForRoster(data.roster, played, "Brazil");
  const results = resultsForCountry(data.matches, groupPlayed, "Brazil");
  const knockouts = await knockoutsForCountry("Brazil");
  const scorerRows = buildScorerRows(played, "Brazil");
  return (
    <CountryDetail
      data={data}
      goals={goals}
      assists={assists}
      results={results}
      knockouts={knockouts}
      scorerRows={scorerRows}
    />
  );
}
