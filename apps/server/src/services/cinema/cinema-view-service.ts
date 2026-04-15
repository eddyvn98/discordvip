import { prisma } from "../../prisma.js";

export class CinemaViewService {
  async ensureViewTables() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cinema_item_view_stats (
        item_id TEXT PRIMARY KEY,
        view_count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cinema_user_item_views (
        item_id TEXT NOT NULL,
        user_key TEXT NOT NULL,
        first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (item_id, user_key)
      );
    `);
  }

  async getViewStatsMap(itemIds: string[], userKey?: string) {
    const out = new Map<string, { viewCount: number; viewedByCurrentUser: boolean }>();
    if (!itemIds.length) return out;
    const result = (await prisma.$queryRawUnsafe(`
      SELECT
        i.id AS item_id,
        COALESCE(s.view_count, 0)::BIGINT AS view_count,
        CASE
          WHEN $2::TEXT IS NULL THEN FALSE
          ELSE EXISTS (
            SELECT 1
            FROM cinema_user_item_views u
            WHERE u.item_id = i.id AND u.user_key = $2::TEXT
          )
        END AS viewed_by_current_user
      FROM unnest($1::text[]) AS i(id)
      LEFT JOIN cinema_item_view_stats s ON s.item_id = i.id
    `, itemIds, userKey ?? null)) as Array<{ item_id: string; view_count: bigint | number; viewed_by_current_user: boolean }>;
    for (const row of result) {
      out.set(row.item_id, {
        viewCount: typeof row.view_count === "bigint" ? Number(row.view_count) : Number(row.view_count ?? 0),
        viewedByCurrentUser: Boolean(row.viewed_by_current_user),
      });
    }
    return out;
  }

  async markItemViewed(itemId: string, userKey: string) {
    await this.ensureViewTables();
    await prisma.$executeRawUnsafe(
      `INSERT INTO cinema_item_view_stats (item_id, view_count, updated_at)
       VALUES ($1::TEXT, 1, NOW())
       ON CONFLICT (item_id)
       DO UPDATE SET view_count = cinema_item_view_stats.view_count + 1, updated_at = NOW();`,
      itemId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO cinema_user_item_views (item_id, user_key, first_viewed_at)
       VALUES ($1::TEXT, $2::TEXT, NOW())
       ON CONFLICT (item_id, user_key) DO NOTHING;`,
      itemId,
      userKey,
    );
  }
}
