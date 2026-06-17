import type { MemoryStatus, MemoryType } from '@smriti/shared-types';

/** Domain entity representing a persisted memory. */
export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  importance: number;
  status: MemoryStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Fields required to insert a new memory. */
export interface NewMemory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  status: MemoryStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
