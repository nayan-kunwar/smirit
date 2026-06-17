/**
 * Framework-agnostic auth primitives. The HTTP layer adapts these into a guard;
 * the core stays free of any web framework.
 *
 * v1 uses a trusted API-key + user-id header scheme suitable for service-to-
 * service calls. This is intentionally swappable for JWT/OAuth later behind the
 * same `Principal` abstraction.
 */

export interface Principal {
  userId: string;
  scopes: string[];
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export interface AuthHeaders {
  apiKey?: string;
  userId?: string;
}

export interface AuthOptions {
  /** Expected API key. When unset (dev), key checks are skipped. */
  apiKey?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve a principal from request headers, throwing when unauthenticated. */
export function resolvePrincipal(headers: AuthHeaders, options: AuthOptions = {}): Principal {
  if (options.apiKey && headers.apiKey !== options.apiKey) {
    throw new UnauthorizedError('Invalid API key');
  }

  const userId = headers.userId?.trim();
  if (!userId || !UUID_RE.test(userId)) {
    throw new UnauthorizedError('Missing or invalid x-user-id header');
  }

  return { userId, scopes: ['memories:read', 'memories:write'] };
}
