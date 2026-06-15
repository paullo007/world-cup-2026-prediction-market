// Every FIFA World Cup final since 1930 (1942 & 1946 not held — WWII). Winner,
// runner-up beaten in the final, the final score, final-match city, and host
// nation. Historical nations (West Germany, Czechoslovakia, etc.) are shown as
// they were. For finals decided by a shootout, `penalties` is true and the score
// is the shootout result. Source: FIFA / Wikipedia.
export interface WorldCupFinal {
  year: number;
  winner: string;
  beat: string; // runner-up beaten in the final
  winnerGoals: number;
  loserGoals: number;
  penalties?: boolean; // final decided on penalties (score = shootout result)
  city: string; // final-match city
  host: string; // host nation
}

export const WORLD_CUP_HISTORY: WorldCupFinal[] = [
  { year: 1930, winner: "Uruguay", beat: "Argentina", winnerGoals: 4, loserGoals: 2, city: "Montevideo", host: "Uruguay" },
  { year: 1934, winner: "Italy", beat: "Czechoslovakia", winnerGoals: 2, loserGoals: 1, city: "Rome", host: "Italy" },
  { year: 1938, winner: "Italy", beat: "Hungary", winnerGoals: 4, loserGoals: 2, city: "Paris", host: "France" },
  { year: 1950, winner: "Uruguay", beat: "Brazil", winnerGoals: 2, loserGoals: 1, city: "Rio de Janeiro", host: "Brazil" },
  { year: 1954, winner: "West Germany", beat: "Hungary", winnerGoals: 3, loserGoals: 2, city: "Bern", host: "Switzerland" },
  { year: 1958, winner: "Brazil", beat: "Sweden", winnerGoals: 5, loserGoals: 2, city: "Stockholm", host: "Sweden" },
  { year: 1962, winner: "Brazil", beat: "Czechoslovakia", winnerGoals: 3, loserGoals: 1, city: "Santiago", host: "Chile" },
  { year: 1966, winner: "England", beat: "West Germany", winnerGoals: 4, loserGoals: 2, city: "London", host: "England" },
  { year: 1970, winner: "Brazil", beat: "Italy", winnerGoals: 4, loserGoals: 1, city: "Mexico City", host: "Mexico" },
  { year: 1974, winner: "West Germany", beat: "Netherlands", winnerGoals: 2, loserGoals: 1, city: "Munich", host: "West Germany" },
  { year: 1978, winner: "Argentina", beat: "Netherlands", winnerGoals: 3, loserGoals: 1, city: "Buenos Aires", host: "Argentina" },
  { year: 1982, winner: "Italy", beat: "West Germany", winnerGoals: 3, loserGoals: 1, city: "Madrid", host: "Spain" },
  { year: 1986, winner: "Argentina", beat: "West Germany", winnerGoals: 3, loserGoals: 2, city: "Mexico City", host: "Mexico" },
  { year: 1990, winner: "West Germany", beat: "Argentina", winnerGoals: 1, loserGoals: 0, city: "Rome", host: "Italy" },
  { year: 1994, winner: "Brazil", beat: "Italy", winnerGoals: 3, loserGoals: 2, penalties: true, city: "Pasadena", host: "United States" },
  { year: 1998, winner: "France", beat: "Brazil", winnerGoals: 3, loserGoals: 0, city: "Saint-Denis", host: "France" },
  { year: 2002, winner: "Brazil", beat: "Germany", winnerGoals: 2, loserGoals: 0, city: "Yokohama", host: "Japan" },
  { year: 2006, winner: "Italy", beat: "France", winnerGoals: 5, loserGoals: 3, penalties: true, city: "Berlin", host: "Germany" },
  { year: 2010, winner: "Spain", beat: "Netherlands", winnerGoals: 1, loserGoals: 0, city: "Johannesburg", host: "South Africa" },
  { year: 2014, winner: "Germany", beat: "Argentina", winnerGoals: 1, loserGoals: 0, city: "Rio de Janeiro", host: "Brazil" },
  { year: 2018, winner: "France", beat: "Croatia", winnerGoals: 4, loserGoals: 2, city: "Moscow", host: "Russia" },
  { year: 2022, winner: "Argentina", beat: "France", winnerGoals: 4, loserGoals: 2, penalties: true, city: "Lusail", host: "Qatar" },
];
