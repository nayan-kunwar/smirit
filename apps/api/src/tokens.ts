/** DI tokens. Using explicit tokens avoids relying on emitted decorator
 * metadata, so the app works under esbuild/tsx as well as tsc. */
export const TOKENS = {
  Config: 'CONFIG',
  Logger: 'LOGGER',
  Metrics: 'METRICS',
  Db: 'DB',
  Pool: 'POOL',
  Redis: 'REDIS',
  KafkaProducer: 'KAFKA_PRODUCER',
  EmbeddingProvider: 'EMBEDDING_PROVIDER',
  MemoryRepository: 'MEMORY_REPOSITORY',
  ContextCache: 'CONTEXT_CACHE',
  WorkingMemory: 'WORKING_MEMORY',
  CreateMemoryUseCase: 'CREATE_MEMORY_USE_CASE',
  ListMemoriesUseCase: 'LIST_MEMORIES_USE_CASE',
  DeleteMemoryUseCase: 'DELETE_MEMORY_USE_CASE',
  RetrieveContextUseCase: 'RETRIEVE_CONTEXT_USE_CASE',
} as const;
