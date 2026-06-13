import { randomBytes } from "crypto";

// Nickname rules: letters + numbers only, no spaces/symbols, 1–12 chars.
// Case is preserved for display but uniqueness is case-insensitive.
export function validateNickname(raw: string): string | null {
  if (!raw) return "Pick a nickname.";
  if (/\s/.test(raw)) return "No spaces — one continuous word.";
  if (!/^[A-Za-z0-9]+$/.test(raw)) return "Letters and numbers only — no spaces or symbols.";
  if (raw.length > 12) return "Max 12 characters.";
  return null;
}

// Human-friendly recovery code, e.g. "K7QF-3MXR-9TJD". Uses an unambiguous
// alphabet (no I/O/0/1) so it's easy to write down and re-type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRecoveryCode(): { canonical: string; display: string } {
  const bytes = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return { canonical: s, display: `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}` };
}

// Normalize a typed code for comparison (drop dashes/spaces, uppercase).
export function canonicalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
