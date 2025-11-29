export const PUBLIC_SCHEMA_BASIC_TEMPLATE = `import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/schema';

/**
 * Public schema - Your application tables
 * Add your custom tables here
 */
export const exampleTable = pgTable('example_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
`;
