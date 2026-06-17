/**
 * Port for turning text into vector embeddings. Implementations live behind
 * this interface so the domain and retrieval pipeline never bind to a vendor.
 */
export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
