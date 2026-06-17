import type { UserProfile } from '@smriti/shared-types';
import type { Db } from '../connection';

export class PostgresProfileRepository {
  constructor(private readonly db: Db) {}

  async upsert(userId: string, profile: UserProfile): Promise<void> {
    const json = profile as unknown as Record<string, unknown>;
    await this.db
      .insertInto('user_profiles')
      .values({ user_id: userId, profile: json, updated_at: new Date() })
      .onConflict((oc) =>
        oc.column('user_id').doUpdateSet({ profile: json, updated_at: new Date() }),
      )
      .execute();
  }

  async get(userId: string): Promise<UserProfile | null> {
    const row = await this.db
      .selectFrom('user_profiles')
      .select('profile')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return row ? (row.profile as unknown as UserProfile) : null;
  }
}
