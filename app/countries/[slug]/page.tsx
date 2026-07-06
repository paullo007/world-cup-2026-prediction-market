import { notFound } from "next/navigation";
import { getPlayedGroupMatches, getPlayedKnockoutMatches } from "@/lib/playedMatches";
import {
  getCountry,
  goalsForRoster,
  assistsForRoster,
  resultsForCountry,
  countryFromSlug,
} from "@/lib/countries";
import { knockoutsForCountry } from "@/lib/countryKnockouts";
import { buildScorerRows } from "@/lib/scorerRows";
import { CountryDetail } from "@/components/CountryDetail";

export const dynamic = "force-dynamic";

export default async function CountryPage({ params }: { params: { slug: string } }) {
  const name = countryFromSlug(params.slug);
  if (!name) notFound();
  const data = getCountry(name)!;
  const [groupPlayed, knockoutPlayed] = await Promise.all([getPlayedGroupMatches(), getPlayedKnockoutMatches()]);
  const played = [...groupPlayed, ...knockoutPlayed];
  const goals = goalsForRoster(data.roster, played, name);
  const assists = assistsForRoster(data.roster, played, name);
  const results = resultsForCountry(data.matches, groupPlayed, name);
  const knockouts = await knockoutsForCountry(name);
  const scorerRows = buildScorerRows(played, name);
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
