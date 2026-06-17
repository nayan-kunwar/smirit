import { describe, expect, it } from 'vitest';
import { finalScore, normalizeImportance, rankCandidates, recencyScore } from './ranking';

describe('recencyScore', () => {
  it('is 1 for fresh memories', () => {
    expect(recencyScore(0)).toBe(1);
  });

  it('decays with age', () => {
    expect(recencyScore(30, 30)).toBeCloseTo(Math.exp(-1), 5);
    expect(recencyScore(60, 30)).toBeLessThan(recencyScore(30, 30));
  });
});

describe('normalizeImportance', () => {
  it('clamps and scales to [0,1]', () => {
    expect(normalizeImportance(5)).toBe(0.5);
    expect(normalizeImportance(15)).toBe(1);
    expect(normalizeImportance(-3)).toBe(0);
  });
});

describe('finalScore', () => {
  it('weights similarity most heavily by default', () => {
    const high = finalScore({ similarity: 1, importance: 0, ageDays: 9999 });
    const low = finalScore({ similarity: 0, importance: 10, ageDays: 9999 });
    expect(high).toBeGreaterThan(low);
  });
});

describe('rankCandidates', () => {
  it('sorts by score descending and truncates to topN', () => {
    const ranked = rankCandidates(
      [
        { memoryId: 'a', content: 'a', similarity: 0.2, importance: 1, ageDays: 100 },
        { memoryId: 'b', content: 'b', similarity: 0.9, importance: 8, ageDays: 1 },
        { memoryId: 'c', content: 'c', similarity: 0.5, importance: 5, ageDays: 10 },
      ],
      2,
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0].memoryId).toBe('b');
  });
});
