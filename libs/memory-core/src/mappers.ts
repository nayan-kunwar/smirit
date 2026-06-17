import type { MemoryDTO } from '@smriti/shared-types';
import type { Memory } from './domain';

export function toMemoryDTO(memory: Memory): MemoryDTO {
  return {
    id: memory.id,
    userId: memory.userId,
    type: memory.type,
    content: memory.content,
    importance: memory.importance,
    status: memory.status,
    metadata: memory.metadata,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}
