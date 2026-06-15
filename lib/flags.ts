// Country -> ISO 3166-1 alpha-2 code for the 48 World Cup 2026 teams.
const ISO: Record<string, string> = {
  Argentina: "AR",
  Algeria: "DZ",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  "Bosnia and Herzegovina": "BA",
  Brazil: "BR",
  Canada: "CA",
  "Cape Verde": "CV",
  Colombia: "CO",
  Croatia: "HR",
  "Curaçao": "CW",
  Czechia: "CZ",
  "DR Congo": "CD",
  Ecuador: "EC",
  Egypt: "EG",
  England: "GB-ENG",
  France: "FR",
  Germany: "DE",
  Ghana: "GH",
  Haiti: "HT",
  Iran: "IR",
  Iraq: "IQ",
  "Ivory Coast": "CI",
  Japan: "JP",
  Jordan: "JO",
  Mexico: "MX",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Norway: "NO",
  Panama: "PA",
  Paraguay: "PY",
  Portugal: "PT",
  Qatar: "QA",
  "Saudi Arabia": "SA",
  Scotland: "GB-SCT",
  Senegal: "SN",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Tunisia: "TN",
  "Türkiye": "TR",
  "United States": "US",
  Uruguay: "UY",
  Uzbekistan: "UZ",
};

const codeToEmoji = (code: string) =>
  code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));

// England & Scotland use subdivision flags (regional-indicator pairs don't exist
// for them); fall back to the Union Jack so something always renders.
const SUBDIVISION_FALLBACK: Record<string, string> = {
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
};

// Countries that appear in historical / contextual data (e.g. the Brazil tab's
// past World Cup finals and the coach's nationality) but are NOT among the 48
// WC2026 teams — kept out of ISO so ALL_TEAMS stays exactly the 48. Czechoslovakia
// uses the Czech flag (same design as the historical one).
const EXTRA_ISO: Record<string, string> = {
  Italy: "IT",
  Chile: "CL",
  Czechoslovakia: "CZ",
  Hungary: "HU",
  Russia: "RU",
  "West Germany": "DE", // historical finals in the Countries titles tables
};

/** Flag emoji for a country name, or "" if unknown. */
export function flag(country: string): string {
  const code = ISO[country] ?? EXTRA_ISO[country];
  if (!code) return "";
  if (SUBDIVISION_FALLBACK[code]) return SUBDIVISION_FALLBACK[code];
  return codeToEmoji(code);
}

/** Parse "Will {home} beat {away}?" -> [home, away], or null if not a match. */
export function matchTeams(question: string): [string, string] | null {
  const m = question.match(/^Will (.+) beat (.+)\?$/);
  return m ? [m[1], m[2]] : null;
}

// Short names used in question text that differ from our ISO keys.
const NAME_ALIASES: Record<string, string> = { USA: "United States" };

/**
 * Parse a tournament-winner title like "Will {country} win the 2026 FIFA World
 * Cup?" -> the canonical country name, but only if it's a known team. null
 * otherwise (so it never misfires on match/other questions).
 */
export function winnerCountry(question: string): string | null {
  const m = question.match(/^Will (.+?) win /);
  if (!m) return null;
  const name = NAME_ALIASES[m[1]] ?? m[1];
  return ISO[name] ? name : null;
}

/** All 48 World Cup 2026 team names, alphabetically. */
export const ALL_TEAMS: string[] = Object.keys(ISO).sort((a, b) => a.localeCompare(b));
