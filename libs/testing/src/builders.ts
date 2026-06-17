import type { CreateMemoryRequest, MemoryDTO } from '@smriti/shared-types';

const SAMPLE_USER = '22222222-2222-2222-2222-222222222222';

export function aCreateMemoryRequest(
  overrides: Partial<CreateMemoryRequest> = {},
): CreateMemoryRequest {
  return {
    userId: SAMPLE_USER,
    type: 'semantic',
    content: 'I am a backend engineer',
    ...overrides,
  };
}

export function aMemoryDTO(overrides: Partial<MemoryDTO> = {}): MemoryDTO {
  const createdAt = '2026-01-01T00:00:00.000Z';
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: SAMPLE_USER,
    type: 'semantic',
    content: 'I am a backend engineer',
    importance: 5,
    status: 'active',
    metadata: {},
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}
