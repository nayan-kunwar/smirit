import { describe, expect, it } from 'vitest';
import { MockEmbeddingProvider } from './mock-provider';

describe('MockEmbeddingProvider', () => {
  it('is deterministic for the same input', async () => {
    const provider = new MockEmbeddingProvider(64);
    const a = await provider.embed('Learning Kafka');
    const b = await provider.embed('Learning Kafka');
    expect(a).toEqual(b);
    expect(a).toHaveLength(64);
  });

  it('produces unit-length vectors', async () => {
    const provider = new MockEmbeddingProvider(64);
    const v = await provider.embed('hello world');
    const magnitude = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('maps different text to different vectors', async () => {
    const provider = new MockEmbeddingProvider(64);
    const a = await provider.embed('postgres');
    const b = await provider.embed('redis');
    expect(a).not.toEqual(b);
  });
});
