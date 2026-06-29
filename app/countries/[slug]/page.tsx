import { notFound } from "next/navigation";
import { getPlayedMatches } from "@/lib/playedMatches";
import {
  getCountry,
  goalsForRoster,
  assistsForRoster,
  resultsForCountry,
  countryFromSlug,
} from "@/lib/countries";
import { knockoutsForCountry } from "@/lib/countryKnockouts";
import { CountryDetail } from "@/components/CountryDetail";

export const dynamic = "force-dynamic";

export default async function CountryPage({ params }: { params: { slug: string } }) {
  const name = countryFromSlug(params.slug);
  if (!name) notFound();
  const data = getCountry(name)!;
  const played = await getPlayedMatches();
  const goals = goalsForRoster(data.roster, played, name);
  const assists = assistsForRoster(data.roster, played, name);
  const results = resultsForCountry(data.matches, played, name);
  const knockouts = await knockoutsForCountry(name);
  return <CountryDetail data={data} goals={goals} assists={assists} results={results} knockouts={knockouts} />;
}
