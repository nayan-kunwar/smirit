import type { Db } from '../connection';

export interface SummaryRow {
  id: string;
  userId: string;
  summary: string;
  summaryType: string;
  createdAt: Date;
}

export class PostgresSummaryRepository {
  constructor(private readonly db: Db) {}

  async insert(input: {
    id: string;
    userId: string;
    summary: string;
    summaryType?: string;
  }): Promise<void> {
    await this.db
      .insertInto('memory_summaries')
      .values({
        id: input.id,
        user_id: input.userId,
        summary: input.summary,
        summary_type: input.summaryType ?? 'rolling',
      })
      .execute();
  }

  async latestForUser(userId: string, limit = 5): Promise<SummaryRow[]> {
    const rows = await this.db
      .selectFrom('memory_summaries')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      summary: row.summary,
      summaryType: row.summary_type,
      createdAt: new Date(row.created_at),
    }));
  }
}
