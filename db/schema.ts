import { integer, real, sqliteTable, text, index, primaryKey } from "drizzle-orm/sqlite-core";
export const transcripts=sqliteTable("transcripts",{
 id:text("id").primaryKey(),owner:text("owner").notNull(),title:text("title").notNull(),language:text("language").notNull(),text:text("text").notNull(),original:text("original").notNull(),createdAt:text("created_at").notNull(),duration:real("duration").notNull().default(0),source:text("source").notNull(),audioKey:text("audio_key"),mime:text("mime"),
},t=>[index("idx_transcripts_owner_created").on(t.owner,t.createdAt)]);
export const rateLimits=sqliteTable("rate_limits",{owner:text("owner").notNull(),day:text("day").notNull(),count:integer("count").notNull().default(0)},t=>[primaryKey({columns:[t.owner,t.day]})]);

