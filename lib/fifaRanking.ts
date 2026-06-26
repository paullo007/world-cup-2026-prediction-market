// Official FIFA/Coca-Cola Men's World Ranking — STATIC SNAPSHOT of the 48 teams
// in this app's field, as published on 11 June 2026 (the ranking is frozen until
// 20 July 2026, i.e. for the whole tournament, so this stays accurate without
// upkeep). Source: https://inside.fifa.com/fifa-world-ranking/men — FIFA's API
// is browser-gated and not fetchable, so this was transcribed from the official
// page. `rank` is the real WORLD position (gaps exist where a higher team didn't
// qualify, e.g. Italy #14). Re-snapshot after the tournament if desired.
export interface FifaRankRow {
  team: string; // canonical app name (lib/groups.ts)
  rank: number; // FIFA world position
  points: number;
}

export const FIFA_RANKING_AS_OF = "11 June 2026";

// Ordered by FIFA world rank.
export const FIFA_RANKING: FifaRankRow[] = [
  { team: "Argentina", rank: 1, points: 1901.93 },
  { team: "France", rank: 2, points: 1894.40 },
  { team: "Spain", rank: 3, points: 1864.32 },
  { team: "England", rank: 4, points: 1829.82 },
  { team: "Brazil", rank: 5, points: 1785.19 },
  { team: "Morocco", rank: 6, points: 1776.40 },
  { team: "Netherlands", rank: 7, points: 1775.50 },
  { team: "Portugal", rank: 8, points: 1766.74 },
  { team: "Mexico", rank: 9, points: 1736.01 },
  { team: "Belgium", rank: 10, points: 1727.88 },
  { team: "Colombia", rank: 11, points: 1727.42 },
  { team: "Germany", rank: 12, points: 1726.22 },
  { team: "Croatia", rank: 13, points: 1711.48 },
  { team: "United States", rank: 15, points: 1677.17 },
  { team: "Switzerland", rank: 16, points: 1676.00 },
  { team: "Japan", rank: 17, points: 1673.68 },
  { team: "Uruguay", rank: 18, points: 1649.96 },
  { team: "Senegal", rank: 19, points: 1638.36 },
  { team: "Iran", rank: 21, points: 1611.18 },
  { team: "Norway", rank: 22, points: 1606.48 },
  { team: "Austria", rank: 23, points: 1599.99 },
  { team: "Ecuador", rank: 24, points: 1592.59 },
  { team: "Egypt", rank: 26, points: 1583.37 },
  { team: "Türkiye", rank: 27, points: 1582.54 },
  { team: "Australia", rank: 28, points: 1581.35 },
  { team: "Algeria", rank: 29, points: 1575.64 },
  { team: "Ivory Coast", rank: 30, points: 1565.47 },
  { team: "South Korea", rank: 31, points: 1558.72 },
  { team: "Canada", rank: 32, points: 1551.07 },
  { team: "Sweden", rank: 36, points: 1525.58 },
  { team: "Paraguay", rank: 37, points: 1520.59 },
  { team: "Scotland", rank: 41, points: 1491.22 },
  { team: "Panama", rank: 42, points: 1489.05 },
  { team: "DR Congo", rank: 46, points: 1472.37 },
  { team: "Czechia", rank: 48, points: 1467.26 },
  { team: "South Africa", rank: 54, points: 1451.24 },
  { team: "Uzbekistan", rank: 57, points: 1432.84 },
  { team: "Saudi Arabia", rank: 58, points: 1426.71 },
  { team: "Tunisia", rank: 59, points: 1426.58 },
  { team: "Iraq", rank: 60, points: 1419.24 },
  { team: "Qatar", rank: 61, points: 1411.06 },
  { team: "Bosnia and Herzegovina", rank: 62, points: 1408.93 },
  { team: "Cape Verde", rank: 64, points: 1401.77 },
  { team: "Ghana", rank: 65, points: 1398.57 },
  { team: "Jordan", rank: 72, points: 1355.89 },
  { team: "Curaçao", rank: 82, points: 1285.64 },
  { team: "New Zealand", rank: 84, points: 1277.34 },
  { team: "Haiti", rank: 88, points: 1264.58 },
];
