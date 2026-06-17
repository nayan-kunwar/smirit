import { describe, expect, it } from 'vitest';
import { findConsolidationGroups } from './consolidation';

describe('findConsolidationGroups', () => {
  it('groups near-duplicate memories sharing a key token', () => {
    const groups = findConsolidationGroups([
      { id: 'a', content: 'Learning Kafka', importance: 5 },
      { id: 'b', content: 'Studying Kafka', importance: 8 },
      { id: 'c', content: 'Practicing Kafka', importance: 3 },
      { id: 'd', content: 'Cooking pasta', importance: 4 },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].survivingId).toBe('b'); // highest importance
    expect(groups[0].mergedIds.sort()).toEqual(['a', 'c']);
  });

  it('returns no groups when nothing overlaps', () => {
    const groups = findConsolidationGroups([
      { id: 'a', content: 'Learning Kafka', importance: 5 },
      { id: 'b', content: 'Hiking mountains', importance: 5 },
    ]);
    expect(groups).toHaveLength(0);
  });
});
