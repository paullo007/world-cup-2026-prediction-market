/**
 * All-time men's FIFA World Cup top goalscorers (through the 2022 tournament).
 * Static historical reference shown in the collapsible "Top-10 Goal Scorers of
 * All Time" panel on the Scores tab — a sibling of `lib/worldCupHistory.ts`.
 * `country` uses canonical names from lib/flags.ts (incl. EXTRA_ISO entries like
 * West Germany / Hungary) so flags render.
 */
export interface TopScorer {
  rank: number;
  name: string;
  country: string;
  goals: number;
  years: string; // World Cups they scored across
}

export const TOP_SCORERS: TopScorer[] = [
  { rank: 1, name: "Miroslav Klose", country: "Germany", goals: 16, years: "2002–2014" },
  { rank: 2, name: "Ronaldo", country: "Brazil", goals: 15, years: "1998–2006" },
  { rank: 3, name: "Gerd Müller", country: "West Germany", goals: 14, years: "1970–1974" },
  { rank: 4, name: "Just Fontaine", country: "France", goals: 13, years: "1958" },
  { rank: 5, name: "Lionel Messi", country: "Argentina", goals: 13, years: "2006–2022" },
  { rank: 6, name: "Pelé", country: "Brazil", goals: 12, years: "1958–1970" },
  { rank: 7, name: "Kylian Mbappé", country: "France", goals: 12, years: "2018–2022" },
  { rank: 8, name: "Jürgen Klinsmann", country: "Germany", goals: 11, years: "1990–1998" },
  { rank: 9, name: "Sándor Kocsis", country: "Hungary", goals: 11, years: "1954" },
  { rank: 10, name: "Gabriel Batistuta", country: "Argentina", goals: 11, years: "1994–2002" },
];
