import type { EmbeddingProvider } from './provider';

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model: string;
  dimensions: number;
  baseUrl?: string;
}

/**
 * OpenAI embeddings via the REST API using the global `fetch`. Kept dependency
 * free to avoid coupling to a specific SDK version.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIEmbeddingOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.dimensions = options.dimensions;
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI embeddings failed (${response.status}): ${detail}`);
    }

    const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((item) => item.embedding);
  }
}
