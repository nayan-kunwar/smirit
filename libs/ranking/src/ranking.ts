/**
 * Pure ranking functions for the retrieval pipeline. No I/O, fully
 * deterministic, and unit-tested. See
 * docs/architecture/retrieval-pipeline-design.md.
 */

export interface RankingWeights {
  similarity: number;
  importance: number;
  recency: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  similarity: 0.7,
  importance: 0.2,
  recency: 0.1,
};

export const DEFAULT_HALF_LIFE_DAYS = 30;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Exponential decay on age; 1 when fresh, approaching 0 as it ages. */
export function recencyScore(ageDays: number, halfLifeDays = DEFAULT_HALF_LIFE_DAYS): number {
  if (ageDays <= 0) return 1;
  return Math.exp(-ageDays / halfLifeDays);
}

export function normalizeImportance(importance: number): number {
  return clamp(importance, 0, 10) / 10;
}

export interface ScoreInput {
  /** Cosine similarity in [0, 1]. */
  similarity: number;
  /** Raw importance in [0, 10]. */
  importance: number;
  /** Age of the memory in days. */
  ageDays: number;
}

/** Weighted blend of similarity, importance, and recency. */
export function finalScore(input: ScoreInput, weights: RankingWeights = DEFAULT_WEIGHTS): number {
  return (
    clamp(input.similarity, 0, 1) * weights.similarity +
    normalizeImportance(input.importance) * weights.importance +
    recencyScore(input.ageDays) * weights.recency
  );
}

export interface Rankable {
  memoryId: string;
  content: string;
  similarity: number;
  importance: number;
  ageDays: number;
}

export interface RankedItem extends Rankable {
  score: number;
}

/** Score and sort candidates descending, returning at most `topN`. */
export function rankCandidates(
  candidates: Rankable[],
  topN: number,
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankedItem[] {
  return candidates
    .map((candidate) => ({ ...candidate, score: finalScore(candidate, weights) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
