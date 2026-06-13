// Nickname rules: letters + numbers only, no spaces/symbols, 1–12 chars.
// Case is preserved for display but uniqueness is case-insensitive.
export function validateNickname(raw: string): string | null {
  if (!raw) return "Pick a nickname.";
  if (/\s/.test(raw)) return "No spaces — one continuous word.";
  if (!/^[A-Za-z0-9]+$/.test(raw)) return "Letters and numbers only — no spaces or symbols.";
  if (raw.length > 12) return "Max 12 characters.";
  return null;
}
