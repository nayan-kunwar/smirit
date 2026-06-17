import pino, { type Logger, type LoggerOptions } from 'pino';

export type { Logger } from 'pino';

export interface CreateLoggerOptions {
  service: string;
  level?: LoggerOptions['level'];
  pretty?: boolean;
}

/**
 * Create a structured JSON logger. Every log line carries the service name; the
 * caller is expected to bind request/event correlation ids per operation.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, level = process.env.LOG_LEVEL ?? 'info', pretty = false } = options;

  return pino({
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
  });
}
