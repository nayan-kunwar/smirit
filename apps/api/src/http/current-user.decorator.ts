import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { resolvePrincipal, type Principal } from '@smriti/auth';
import type { FastifyRequest } from 'fastify';

/**
 * Resolves the authenticated principal from request headers. Throws
 * UnauthorizedError (mapped to 401 by the domain exception filter) when absent.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return resolvePrincipal({
      apiKey: header(request, 'x-api-key'),
      userId: header(request, 'x-user-id'),
    });
  },
);

function header(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
