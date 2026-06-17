import type { Logger } from './logger';

/**
 * Register graceful-shutdown handlers for SIGINT/SIGTERM. The provided cleanup
 * runs once; the process exits afterward.
 */
export function registerShutdown(cleanup: () => Promise<void>, logger: Logger): void {
  let closing = false;
  const close = (signal: string): void => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'shutting down');
    cleanup()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error({ err: String(error) }, 'shutdown error');
        process.exit(1);
      });
  };
  process.on('SIGINT', () => close('SIGINT'));
  process.on('SIGTERM', () => close('SIGTERM'));
}
