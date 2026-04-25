// 6-char readable code — user types it into Telegram as `/verify XXXXXX`.
// Alphabet drops 0/O/1/I to avoid lookalikes.
export const VERIFICATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VERIFICATION_CODE_LENGTH = 6;

export function generateVerificationCode(): string {
  const alphabet = VERIFICATION_CODE_ALPHABET;
  let out = "";
  const buf = crypto.getRandomValues(new Uint8Array(VERIFICATION_CODE_LENGTH));
  for (const b of buf) out += alphabet[b % alphabet.length];
  return out;
}
