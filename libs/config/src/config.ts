import { z } from 'zod';

const csv = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  HTTP_HOST: z.string().default('0.0.0.0'),
  HTTP_PORT: z.coerce.number().int().positive().default(3000),

  POSTGRES_URL: z.string().min(1),
  POSTGRES_POOL_SIZE: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().min(1),

  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default('smriti'),
  KAFKA_GROUP_ID: z.string().default('smriti-workers'),

  EMBEDDING_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  OPENAI_API_KEY: z.string().optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().default('smriti'),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AppConfig {
  nodeEnv: RawEnv['NODE_ENV'];
  http: { host: string; port: number };
  postgres: { url: string; poolSize: number };
  redis: { url: string };
  kafka: { brokers: string[]; clientId: string; groupId: string };
  embedding: {
    provider: RawEnv['EMBEDDING_PROVIDER'];
    model: string;
    dimensions: number;
    openaiApiKey?: string;
  };
  otel: { exporterUrl: string; serviceName: string };
}

/**
 * Parse and validate configuration once at startup. Throws (fail-fast) when the
 * environment is invalid, instead of failing lazily at first use.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    http: { host: e.HTTP_HOST, port: e.HTTP_PORT },
    postgres: { url: e.POSTGRES_URL, poolSize: e.POSTGRES_POOL_SIZE },
    redis: { url: e.REDIS_URL },
    kafka: {
      brokers: csv(e.KAFKA_BROKERS),
      clientId: e.KAFKA_CLIENT_ID,
      groupId: e.KAFKA_GROUP_ID,
    },
    embedding: {
      provider: e.EMBEDDING_PROVIDER,
      model: e.EMBEDDING_MODEL,
      dimensions: e.EMBEDDING_DIMENSIONS,
      openaiApiKey: e.OPENAI_API_KEY,
    },
    otel: { exporterUrl: e.OTEL_EXPORTER_OTLP_ENDPOINT, serviceName: e.OTEL_SERVICE_NAME },
  };
}
