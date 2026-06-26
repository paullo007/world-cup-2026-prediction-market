// Human-facing pages for the data feeds the results pipeline pulls from
// (lib/results.ts). Shown as "Source:" attribution on the data-driven tabs so
// the figures are verifiable. Scores & Standings are cross-checked from BOTH
// feeds; goalscorers come from ESPN only (TheSportsDB's season feed has no
// scorer data), so Goals cites ESPN alone.
export interface SourceLink {
  label: string;
  url: string;
}

export const ESPN_SOURCE: SourceLink = {
  label: "ESPN",
  url: "https://www.espn.com/soccer/scoreboard/_/league/fifa.world",
};

export const THESPORTSDB_SOURCE: SourceLink = {
  label: "TheSportsDB",
  url: "https://www.thesportsdb.com/league/4429-FIFA-World-Cup",
};

export const SCORES_SOURCES: SourceLink[] = [ESPN_SOURCE, THESPORTSDB_SOURCE];
export const STANDINGS_SOURCES: SourceLink[] = [ESPN_SOURCE, THESPORTSDB_SOURCE];
export const GOALS_SOURCES: SourceLink[] = [ESPN_SOURCE];
export const RANKINGS_SOURCES: SourceLink[] = [
  { label: "FIFA/Coca-Cola World Ranking", url: "https://inside.fifa.com/fifa-world-ranking/men" },
];
