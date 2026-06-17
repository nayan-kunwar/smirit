import { Kafka, logLevel } from 'kafkajs';

export interface KafkaClientOptions {
  brokers: string[];
  clientId: string;
}

export function createKafka(options: KafkaClientOptions): Kafka {
  return new Kafka({
    clientId: options.clientId,
    brokers: options.brokers,
    logLevel: logLevel.NOTHING,
    retry: { retries: 5 },
  });
}
