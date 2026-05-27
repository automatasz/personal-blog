-- D1 initial migration: all tables (SQLite-compatible)
-- Previously: keyworder schema on PostgreSQL

CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "credits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updatedAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updatedAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id")
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id"),
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TEXT,
  "refreshTokenExpiresAt" TEXT,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updatedAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT DEFAULT (CURRENT_TIMESTAMP),
  "updatedAt" TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "description" (
  "id" TEXT PRIMARY KEY,
  "file_id" TEXT NOT NULL,
  "file_name" TEXT,
  "keywords" TEXT,
  "description" TEXT,
  "title" TEXT,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "batch_id" TEXT NOT NULL,
  "tokens_used" INTEGER,
  "result" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "created_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "batch" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "credit_audit" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "user"("id"),
  "amount" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "updated_by" TEXT REFERENCES "user"("id")
);

-- Seed default credit costs
INSERT INTO "app_settings" ("key", "value") VALUES ('credit_costs', '{"upload":1,"describe":7,"regenerate":5}');
