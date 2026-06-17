import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import type { ListMemoriesUseCase } from '@smriti/memory-core';
import { ZodValidationPipe } from '../http/zod-validation.pipe';
import { listQuerySchema, type ListQuery } from '../dto';
import { TOKENS } from '../tokens';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(TOKENS.ListMemoriesUseCase) private readonly listMemories: ListMemoriesUseCase,
  ) {}

  @Get(':id/memories')
  async memories(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    const items = await this.listMemories.execute(id, {
      limit: query.limit,
      offset: query.offset,
    });
    return { items, count: items.length };
  }
}
