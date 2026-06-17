/**
 * Heuristic importance scoring (0-10). Pure and deterministic so it can be unit
 * tested and swapped for an LLM-based scorer later behind the same signature.
 *
 * Signals: length/specificity, presence of durable "fact" markers, and penalty
 * for trivial filler ("hi", "ok"). This favors substantive, identity- or
 * preference-bearing statements ("I am a backend engineer") over chit-chat.
 */
const TRIVIAL = new Set(['hi', 'hello', 'hey', 'ok', 'okay', 'thanks', 'thank you', 'yo']);

const SIGNAL_PATTERNS = [
  /\bi (am|work|use|prefer|know|learned|built|deployed|studied)\b/i,
  /\b(engineer|developer|architect|founder|manager)\b/i,
  /\b(prefers?|favorite|always|never)\b/i,
];

export function scoreImportance(content: string): number {
  const text = content.trim().toLowerCase();
  if (text.length === 0 || TRIVIAL.has(text)) {
    return 1;
  }

  let score = 2;

  // Length / specificity.
  const words = text.split(/\s+/).length;
  if (words >= 4) score += 2;
  if (words >= 10) score += 2;

  // Durable fact markers.
  for (const pattern of SIGNAL_PATTERNS) {
    if (pattern.test(content)) score += 2;
  }

  return Math.min(Math.max(Math.round(score), 1), 10);
}
