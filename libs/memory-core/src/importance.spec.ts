import { describe, expect, it } from 'vitest';
import { scoreImportance } from './importance';

describe('scoreImportance', () => {
  it('scores trivial chit-chat as 1', () => {
    expect(scoreImportance('Hi')).toBe(1);
    expect(scoreImportance('ok')).toBe(1);
  });

  it('scores substantive identity statements highly', () => {
    expect(scoreImportance('I am a backend engineer')).toBeGreaterThanOrEqual(6);
  });

  it('is bounded to [1, 10]', () => {
    const score = scoreImportance(
      'I am a backend engineer and I prefer PostgreSQL and I deployed a service today',
    );
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });
});
