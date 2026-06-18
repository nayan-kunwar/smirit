import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const base = {
  POSTGRES_URL: 'postgres://localhost:5432/smriti',
  REDIS_URL: 'redis://localhost:6379',
  KAFKA_BROKERS: 'localhost:9092,localhost:9093',
};

describe('loadConfig', () => {
  it('parses a valid environment with defaults applied', () => {
    const config = loadConfig(base as NodeJS.ProcessEnv);
    expect(config.http.port).toBe(3000);
    expect(config.kafka.brokers).toEqual(['localhost:9092', 'localhost:9093']);
    expect(config.kafka.ssl).toBe(false);
    expect(config.kafka.sasl).toBeUndefined();
    expect(config.embedding.provider).toBe('mock');
  });

  it('parses managed Kafka SASL settings and auto-enables SSL', () => {
    const config = loadConfig({
      ...base,
      KAFKA_SSL: 'false',
      KAFKA_SASL_USERNAME: 'smriti',
      KAFKA_SASL_PASSWORD: 'secret',
    } as NodeJS.ProcessEnv);
    expect(config.kafka.ssl).toBe(true);
    expect(config.kafka.sasl).toEqual({
      mechanism: 'scram-sha-256',
      username: 'smriti',
      password: 'secret',
    });
  });

  it('requires both SASL username and password', () => {
    expect(() =>
      loadConfig({ ...base, KAFKA_SASL_USERNAME: 'smriti' } as NodeJS.ProcessEnv),
    ).toThrow(/KAFKA_SASL_USERNAME and KAFKA_SASL_PASSWORD/);
  });

  it('throws on missing required values', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/Invalid environment/);
  });

  it('coerces numeric values', () => {
    const config = loadConfig({ ...base, HTTP_PORT: '8080' } as NodeJS.ProcessEnv);
    expect(config.http.port).toBe(8080);
  });

  it('requires API_KEY in production', () => {
    expect(() =>
      loadConfig({ ...base, NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toThrow(/API_KEY is required/);
  });
});
