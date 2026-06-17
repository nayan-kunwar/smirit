import type { EmbeddingProvider } from './provider';

/**
 * Deterministic, dependency-free embedding provider for tests and local dev.
 * The same text always maps to the same normalized vector, so similarity is
 * stable and assertions are reliable.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly model = 'mock-embedding';

  constructor(readonly dimensions = 1536) {}

  async embed(text: string): Promise<number[]> {
    return this.deterministicVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.deterministicVector(t));
  }

  private deterministicVector(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      vector[(code + i) % this.dimensions] += ((code % 23) + 1) / 23;
    }
    return normalize(vector);
  }
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}
