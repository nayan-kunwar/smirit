import { describe, expect, it } from 'vitest';
import { resolvePrincipal, UnauthorizedError } from './principal';

const userId = '22222222-2222-2222-2222-222222222222';

describe('resolvePrincipal', () => {
  it('resolves a principal from a valid user id', () => {
    const principal = resolvePrincipal({ userId });
    expect(principal.userId).toBe(userId);
    expect(principal.scopes).toContain('memories:read');
  });

  it('rejects a missing user id', () => {
    expect(() => resolvePrincipal({})).toThrow(UnauthorizedError);
  });

  it('rejects a malformed user id', () => {
    expect(() => resolvePrincipal({ userId: 'not-a-uuid' })).toThrow(UnauthorizedError);
  });

  it('enforces api key when configured', () => {
    expect(() => resolvePrincipal({ userId, apiKey: 'wrong' }, { apiKey: 'right' })).toThrow(
      UnauthorizedError,
    );
    expect(resolvePrincipal({ userId, apiKey: 'right' }, { apiKey: 'right' }).userId).toBe(userId);
  });
});
