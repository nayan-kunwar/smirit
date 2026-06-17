/**
 * Naive, deterministic rolling summary builder. Pure and testable; intended to
 * be replaced by an LLM-backed summarizer behind the same signature without
 * changing callers.
 */
export function buildRollingSummary(contents: string[], maxBullets = 10): string {
  const seen = new Set<string>();
  const bullets: string[] = [];

  for (const raw of contents) {
    const content = raw.trim();
    const key = content.toLowerCase();
    if (!content || seen.has(key)) continue;
    seen.add(key);
    bullets.push(`- ${content}`);
    if (bullets.length >= maxBullets) break;
  }

  if (bullets.length === 0) {
    return 'No notable memories yet.';
  }
  return `User:\n${bullets.join('\n')}`;
}
