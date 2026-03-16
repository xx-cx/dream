import { pgTable, serial, timestamp, text, varchar, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 梦境分享表
export const dreamShares = pgTable(
  "dream_shares",
  {
    id: serial("id").primaryKey(),
    dreamContent: text("dream_content").notNull(),
    dreamInterpretation: text("dream_interpretation"),
    authorName: varchar("author_name", { length: 100 }).notNull().default("匿名梦友"),
    likesCount: integer("likes_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("dream_shares_created_at_idx").on(table.createdAt),
  ]
);
