// Every FIFA World Cup final since 1930 (1942 & 1946 not held — WWII). Winner,
// runner-up beaten in the final, final-match city, and host nation. Historical
// nations (West Germany, Czechoslovakia, etc.) are shown as they were; "(on
// penalties)" notes finals decided by a shootout. Source: FIFA / Wikipedia.
export interface WorldCupFinal {
  year: number;
  winner: string;
  beat: string; // runner-up beaten in the final
  city: string; // final-match city
  host: string; // host nation
}

export const WORLD_CUP_HISTORY: WorldCupFinal[] = [
  { year: 1930, winner: "Uruguay", beat: "Argentina", city: "Montevideo", host: "Uruguay" },
  { year: 1934, winner: "Italy", beat: "Czechoslovakia", city: "Rome", host: "Italy" },
  { year: 1938, winner: "Italy", beat: "Hungary", city: "Paris", host: "France" },
  { year: 1950, winner: "Uruguay", beat: "Brazil", city: "Rio de Janeiro", host: "Brazil" },
  { year: 1954, winner: "West Germany", beat: "Hungary", city: "Bern", host: "Switzerland" },
  { year: 1958, winner: "Brazil", beat: "Sweden", city: "Stockholm", host: "Sweden" },
  { year: 1962, winner: "Brazil", beat: "Czechoslovakia", city: "Santiago", host: "Chile" },
  { year: 1966, winner: "England", beat: "West Germany", city: "London", host: "England" },
  { year: 1970, winner: "Brazil", beat: "Italy", city: "Mexico City", host: "Mexico" },
  { year: 1974, winner: "West Germany", beat: "Netherlands", city: "Munich", host: "West Germany" },
  { year: 1978, winner: "Argentina", beat: "Netherlands", city: "Buenos Aires", host: "Argentina" },
  { year: 1982, winner: "Italy", beat: "West Germany", city: "Madrid", host: "Spain" },
  { year: 1986, winner: "Argentina", beat: "West Germany", city: "Mexico City", host: "Mexico" },
  { year: 1990, winner: "West Germany", beat: "Argentina", city: "Rome", host: "Italy" },
  { year: 1994, winner: "Brazil", beat: "Italy (on penalties)", city: "Pasadena", host: "United States" },
  { year: 1998, winner: "France", beat: "Brazil", city: "Saint-Denis", host: "France" },
  { year: 2002, winner: "Brazil", beat: "Germany", city: "Yokohama", host: "Japan" },
  { year: 2006, winner: "Italy", beat: "France (on penalties)", city: "Berlin", host: "Germany" },
  { year: 2010, winner: "Spain", beat: "Netherlands", city: "Johannesburg", host: "South Africa" },
  { year: 2014, winner: "Germany", beat: "Argentina", city: "Rio de Janeiro", host: "Brazil" },
  { year: 2018, winner: "France", beat: "Croatia", city: "Moscow", host: "Russia" },
  { year: 2022, winner: "Argentina", beat: "France (on penalties)", city: "Lusail", host: "Qatar" },
];
