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

/** Flag emoji for a country name, or "" if unknown. */
export function flag(country: string): string {
  const code = ISO[country];
  if (!code) return "";
  if (SUBDIVISION_FALLBACK[code]) return SUBDIVISION_FALLBACK[code];
  return codeToEmoji(code);
}

/** Parse "Will {home} beat {away}?" -> [home, away], or null if not a match. */
export function matchTeams(question: string): [string, string] | null {
  const m = question.match(/^Will (.+) beat (.+)\?$/);
  return m ? [m[1], m[2]] : null;
}
