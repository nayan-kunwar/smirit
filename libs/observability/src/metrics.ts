import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

/**
 * A self-contained metrics registry plus the domain metrics described in
 * docs/architecture/observability-design.md. One instance is created per app.
 */
export class Metrics {
  readonly registry: Registry;

  readonly retrievalLatency: Histogram<'cache_hit'>;
  readonly embeddingDuration: Histogram<'provider' | 'model'>;
  readonly contextCacheEvents: Counter<'result'>;
  readonly memoryCount: Gauge<'type'>;
  readonly kafkaConsumerLag: Gauge<'topic' | 'group'>;
  readonly eventsProcessed: Counter<'topic' | 'status'>;
  readonly eventsDlq: Counter<'topic'>;
  readonly httpRequests: Counter<'route' | 'method' | 'status'>;
  readonly httpRequestDuration: Histogram<'route' | 'method'>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.retrievalLatency = new Histogram({
      name: 'retrieval_latency_seconds',
      help: 'End-to-end retrieval latency in seconds',
      labelNames: ['cache_hit'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
      registers: [this.registry],
    });

    this.embeddingDuration = new Histogram({
      name: 'embedding_duration_seconds',
      help: 'Time to generate an embedding in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.contextCacheEvents = new Counter({
      name: 'context_cache_events_total',
      help: 'Context cache outcomes',
      labelNames: ['result'],
      registers: [this.registry],
    });

    this.memoryCount = new Gauge({
      name: 'memory_count',
      help: 'Number of memories by type',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.kafkaConsumerLag = new Gauge({
      name: 'kafka_consumer_lag',
      help: 'Kafka consumer lag by topic and group',
      labelNames: ['topic', 'group'],
      registers: [this.registry],
    });

    this.eventsProcessed = new Counter({
      name: 'events_processed_total',
      help: 'Worker event throughput by topic and status',
      labelNames: ['topic', 'status'],
      registers: [this.registry],
    });

    this.eventsDlq = new Counter({
      name: 'events_dlq_total',
      help: 'Messages routed to the dead-letter queue by topic',
      labelNames: ['topic'],
      registers: [this.registry],
    });

    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'HTTP requests by route, method, and status',
      labelNames: ['route', 'method', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['route', 'method'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  /** Prometheus exposition format for the /metrics endpoint. */
  async expose(): Promise<{ contentType: string; body: string }> {
    return {
      contentType: this.registry.contentType,
      body: await this.registry.metrics(),
    };
  }
}

let singleton: Metrics | undefined;

/** Lazily-created process-wide metrics instance. */
export function getMetrics(): Metrics {
  singleton ??= new Metrics();
  return singleton;
}
