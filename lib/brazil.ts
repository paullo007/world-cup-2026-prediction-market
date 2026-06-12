import { KICKOFFS } from "@/lib/kickoffs";
import { VENUES, type Venue } from "@/lib/venues";
import type { SourceLink } from "@/lib/sources";

// ─────────────────────────────────────────────────────────────────────────────
// Static, sourced data for the dedicated Brazil tab. Player identity (name, age,
// position, jersey) is ESPN's official 26-man roster (team id 205). Club is
// filled only where a named source confirms it — others are left null rather
// than guessed. Coach and title history are Wikipedia/FIFA-sourced. Live values
// (goals) are computed from the app's own results pipeline at render time;
// assists and caps have no reliable feed and are shown as 0 / "—".
// All sources are listed at the bottom of the tab (BRAZIL_SOURCES).
// ─────────────────────────────────────────────────────────────────────────────

export type Position = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";

export interface BrazilPlayer {
  number: number | null;
  name: string;
  age: number | null;
  position: Position;
  club: string | null; // null = not yet confirmed from a source
}

// ESPN roster (id 205). Clubs sourced from the user's FIFA/ChatGPT brief +
// corroborating squad reports (FourFourTwo / Yahoo); unconfirmed clubs are null.
export const BRAZIL_ROSTER: BrazilPlayer[] = [
  { number: 1, name: "Alisson Becker", age: 33, position: "Goalkeeper", club: "Liverpool" },
  { number: 12, name: "Weverton", age: 38, position: "Goalkeeper", club: null },
  { number: 23, name: "Ederson", age: 32, position: "Goalkeeper", club: null },
  { number: 3, name: "Gabriel Magalhães", age: 28, position: "Defender", club: "Arsenal" },
  { number: 4, name: "Marquinhos", age: 32, position: "Defender", club: "Paris Saint-Germain" },
  { number: 6, name: "Alex Sandro", age: 35, position: "Defender", club: null },
  { number: 13, name: "Danilo", age: 34, position: "Defender", club: null },
  { number: 14, name: "Bremer", age: 29, position: "Defender", club: null },
  { number: 15, name: "Léo Pereira", age: 30, position: "Defender", club: null },
  { number: 16, name: "Douglas Santos", age: 32, position: "Defender", club: null },
  { number: 24, name: "Roger Ibañez", age: 27, position: "Defender", club: null },
  { number: 2, name: "Éderson", age: 26, position: "Midfielder", club: null },
  { number: 5, name: "Casemiro", age: 34, position: "Midfielder", club: "Manchester United" },
  { number: 8, name: "Bruno Guimarães", age: 28, position: "Midfielder", club: "Newcastle United" },
  { number: 17, name: "Fabinho", age: 32, position: "Midfielder", club: null },
  { number: 18, name: "Danilo Santos", age: 25, position: "Midfielder", club: null },
  { number: 20, name: "Lucas Paquetá", age: 28, position: "Midfielder", club: null },
  { number: 7, name: "Vinícius Júnior", age: 25, position: "Forward", club: "Real Madrid" },
  { number: 9, name: "Matheus Cunha", age: 27, position: "Forward", club: null },
  { number: 10, name: "Neymar", age: 34, position: "Forward", club: "Santos" },
  { number: 11, name: "Raphinha", age: 29, position: "Forward", club: "Barcelona" },
  { number: 19, name: "Endrick", age: 19, position: "Forward", club: null },
  { number: 21, name: "Luiz Henrique", age: 25, position: "Forward", club: null },
  { number: 22, name: "Gabriel Martinelli", age: 24, position: "Forward", club: "Arsenal" },
  { number: 25, name: "Igor Thiago", age: 24, position: "Forward", club: "Brentford" },
  { number: 26, name: "Rayan", age: 19, position: "Forward", club: "Bournemouth" },
];

export const BRAZIL_COACH = { name: "Carlo Ancelotti", country: "Italy" };

export interface WorldCupTitle {
  year: number;
  beat: string; // opponent defeated in the final
  city: string; // final venue city
  host: string; // host country
}

// Brazil's 5 World Cup titles (Wikipedia: "Brazil at the FIFA World Cup").
export const BRAZIL_TITLES: WorldCupTitle[] = [
  { year: 1958, beat: "Sweden", city: "Stockholm", host: "Sweden" },
  { year: 1962, beat: "Czechoslovakia", city: "Santiago", host: "Chile" },
  { year: 1970, beat: "Italy", city: "Mexico City", host: "Mexico" },
  { year: 1994, beat: "Italy (on penalties)", city: "Pasadena", host: "United States" },
  { year: 2002, beat: "Germany", city: "Yokohama", host: "Japan" },
];

// Group-stage fixtures involving Brazil, drawn from the app's own verified
// kickoff/venue data (authoritative over aggregators per project rules).
export const BRAZIL_FIXTURE_KEYS = [
  "Brazil vs Morocco",
  "Brazil vs Haiti",
  "Scotland vs Brazil",
];

export interface BrazilMatch {
  home: string;
  away: string;
  opponent: string;
  kickoffIso: string;
  venue?: Venue;
}

export function getBrazilMatches(): BrazilMatch[] {
  return BRAZIL_FIXTURE_KEYS.filter((k) => KICKOFFS[k]).map((k) => {
    const [home, away] = k.split(" vs ");
    return {
      home,
      away,
      opponent: home === "Brazil" ? away : home,
      kickoffIso: KICKOFFS[k],
      venue: VENUES[k],
    };
  });
}

// Sources for everything on the tab — shown at the bottom in the same format as
// the Goals/Standings tabs. All verified reachable in a browser.
export const BRAZIL_SOURCES: SourceLink[] = [
  { label: "FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026" },
  { label: "CBF", url: "https://www.cbf.com.br/" },
  { label: "FBref", url: "https://fbref.com/en/country/BRA/Brazil-Football" },
  { label: "Transfermarkt", url: "https://www.transfermarkt.com/brasilien/startseite/verein/3439" },
  { label: "Soccerway", url: "https://int.soccerway.com/national/brazil/" },
  { label: "WorldFootball", url: "https://www.worldfootball.net/teams/brasilien/" },
  { label: "ESPN", url: "https://www.espn.com/soccer/team/_/id/205/brazil" },
  { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Brazil_at_the_FIFA_World_Cup" },
  { label: "The Guardian", url: "https://www.theguardian.com/football/world-cup-2026" },
];
