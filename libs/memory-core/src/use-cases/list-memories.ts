import { DEFAULT_LIST_OPTIONS, type ListOptions, type MemoryDTO } from '@smriti/shared-types';
import { toMemoryDTO } from '../mappers';
import type { MemoryRepository } from '../ports';

export class ListMemoriesUseCase {
  constructor(private readonly memories: MemoryRepository) {}

  async execute(userId: string, options: Partial<ListOptions> = {}): Promise<MemoryDTO[]> {
    const opts: ListOptions = {
      limit: options.limit ?? DEFAULT_LIST_OPTIONS.limit,
      offset: options.offset ?? DEFAULT_LIST_OPTIONS.offset,
    };
    const memories = await this.memories.listByUser(userId, opts);
    return memories.map(toMemoryDTO);
  }
}
