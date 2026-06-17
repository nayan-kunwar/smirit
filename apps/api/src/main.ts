import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadConfig } from '@smriti/config';
import { createLogger, startTracing } from '@smriti/observability';
import type { IncomingMessage } from 'node:http';
import { v4 as uuid } from 'uuid';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './http/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: `${config.otel.serviceName}-api` });

  const tracing = startTracing({
    serviceName: `${config.otel.serviceName}-api`,
    exporterUrl: config.otel.exporterUrl,
  });

  const adapter = new FastifyAdapter({
    genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string) ?? uuid(),
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableShutdownHooks();

  const close = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    await app.close();
    await tracing.shutdown();
    process.exit(0);
  };
  process.on('SIGINT', () => void close('SIGINT'));
  process.on('SIGTERM', () => void close('SIGTERM'));

  await app.listen({ host: config.http.host, port: config.http.port });
  logger.info({ host: config.http.host, port: config.http.port }, 'api listening');
}

bootstrap().catch((error) => {
  console.error('Failed to start api:', error);
  process.exit(1);
});
