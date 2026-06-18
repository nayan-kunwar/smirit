import { Kafka, logLevel, type SASLOptions } from 'kafkajs';

export interface KafkaSaslConfig {
  mechanism: 'scram-sha-256' | 'plain';
  username: string;
  password: string;
}

export interface KafkaClientOptions {
  brokers: string[];
  clientId: string;
  groupId?: string;
  ssl?: boolean;
  sasl?: KafkaSaslConfig;
}

function toKafkaSasl(sasl: KafkaSaslConfig): SASLOptions {
  return {
    mechanism: sasl.mechanism,
    username: sasl.username,
    password: sasl.password,
  };
}

export function createKafka(options: KafkaClientOptions): Kafka {
  return new Kafka({
    clientId: options.clientId,
    brokers: options.brokers,
    logLevel: logLevel.NOTHING,
    retry: { retries: 5 },
    ...(options.ssl ? { ssl: true } : {}),
    ...(options.sasl ? { sasl: toKafkaSasl(options.sasl) } : {}),
  });
}
