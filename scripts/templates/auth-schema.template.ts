export const AUTH_SCHEMA_TEMPLATE = `import { uuid, text, timestamp, jsonb, pgSchema, boolean, bigint, varchar, inet, smallint } from 'drizzle-orm/pg-core';

/**
 * Auth schema - managed by Supabase
 * These tables are READ-ONLY and for TypeScript reference only
 * DO NOT generate migrations for auth schema
 */
export const authSchema = pgSchema('auth');

// Main users table
export const users = authSchema.table('users', {
  instanceId: uuid('instance_id'),
  id: uuid('id').primaryKey(),
  aud: varchar('aud', { length: 255 }),
  role: varchar('role', { length: 255 }),
  email: varchar('email', { length: 255 }),
  encryptedPassword: varchar('encrypted_password', { length: 255 }),
  emailConfirmedAt: timestamp('email_confirmed_at', { withTimezone: true }),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  confirmationToken: varchar('confirmation_token', { length: 255 }),
  confirmationSentAt: timestamp('confirmation_sent_at', { withTimezone: true }),
  recoveryToken: varchar('recovery_token', { length: 255 }),
  recoverySentAt: timestamp('recovery_sent_at', { withTimezone: true }),
  emailChangeTokenNew: varchar('email_change_token_new', { length: 255 }),
  emailChange: varchar('email_change', { length: 255 }),
  emailChangeSentAt: timestamp('email_change_sent_at', { withTimezone: true }),
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  rawAppMetaData: jsonb('raw_app_meta_data'),
  rawUserMetaData: jsonb('raw_user_meta_data'),
  isSuperAdmin: boolean('is_super_admin'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  phone: text('phone'),
  phoneConfirmedAt: timestamp('phone_confirmed_at', { withTimezone: true }),
  phoneChange: text('phone_change'),
  phoneChangeToken: varchar('phone_change_token', { length: 255 }),
  phoneChangeSentAt: timestamp('phone_change_sent_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  emailChangeTokenCurrent: varchar('email_change_token_current', { length: 255 }),
  emailChangeConfirmStatus: smallint('email_change_confirm_status'),
  bannedUntil: timestamp('banned_until', { withTimezone: true }),
  reauthenticationToken: varchar('reauthentication_token', { length: 255 }),
  reauthenticationSentAt: timestamp('reauthentication_sent_at', { withTimezone: true }),
  isSsoUser: boolean('is_sso_user').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
});

// Sessions table
export const sessions = authSchema.table('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  factorId: uuid('factor_id'),
  aal: text('aal'),
  notAfter: timestamp('not_after', { withTimezone: true }),
  refreshedAt: timestamp('refreshed_at'),
  userAgent: text('user_agent'),
  ip: inet('ip'),
  tag: text('tag'),
  oauthClientId: uuid('oauth_client_id'),
  refreshTokenHmacKey: text('refresh_token_hmac_key'),
  refreshTokenCounter: bigint('refresh_token_counter', { mode: 'number' }),
  scopes: text('scopes'),
});

// Identities table
export const identities = authSchema.table('identities', {
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  identityData: jsonb('identity_data').notNull(),
  provider: text('provider').notNull(),
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  email: text('email'),
  id: uuid('id').primaryKey().defaultRandom(),
});

// Refresh tokens
export const refreshTokens = authSchema.table('refresh_tokens', {
  instanceId: uuid('instance_id'),
  id: bigint('id', { mode: 'number' }).primaryKey(),
  token: varchar('token', { length: 255 }),
  userId: varchar('user_id', { length: 255 }),
  revoked: boolean('revoked'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  parent: varchar('parent', { length: 255 }),
  sessionId: uuid('session_id').references(() => sessions.id),
});

// MFA tables
export const mfaFactors = authSchema.table('mfa_factors', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  friendlyName: text('friendly_name'),
  factorType: text('factor_type').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  secret: text('secret'),
  phone: text('phone'),
  lastChallengedAt: timestamp('last_challenged_at', { withTimezone: true }),
});

export const mfaChallenges = authSchema.table('mfa_challenges', {
  id: uuid('id').primaryKey(),
  factorId: uuid('factor_id').notNull().references(() => mfaFactors.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  ipAddress: inet('ip_address').notNull(),
  otpCode: text('otp_code'),
});

// Audit log
export const auditLogEntries = authSchema.table('audit_log_entries', {
  instanceId: uuid('instance_id'),
  id: uuid('id').primaryKey(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 255 }).notNull(),
});
`;
