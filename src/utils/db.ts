import { Pool } from "pg";
import { DATABASE_URL } from "astro:env/server";
import {
  Kysely,
  PostgresDialect,
  type ColumnType,
  type Generated,
  type Insertable,
  type Selectable,
  type Updateable,
} from "kysely";

export interface Database {
  description: Tables["keyworder.description"];
  user: Tables["keyworder.user"];
  session: Tables["keyworder.session"];
  account: Tables["keyworder.account"];
  verification: Tables["keyworder.verification"];
}

interface Tables {
  "keyworder.description": DescriptionTable;
  "keyworder.user": AuthUserTable;
  "keyworder.session": SessionTable;
  "keyworder.account": AccountTable;
  "keyworder.verification": VerificationTable;
}

export interface DescriptionTable {
  id: Generated<string>;
  file_id: string;
  file_name: string | null;
  keywords: string[] | null;
  description: string | null;
  title: string | null;
  user_id: string;
  batch_id: string;
  tokens_used: number | null;
  result: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export type Description = Selectable<DescriptionTable>;
export type NewDescription = Insertable<DescriptionTable>;
export type DescriptionUpdate = Updateable<DescriptionTable>;

export interface AuthUserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string;
}

export type User = Selectable<AuthUserTable>;

export interface SessionTable {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Session = Selectable<SessionTable>;

export interface AccountTable {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Account = Selectable<AccountTable>;

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type Verification = Selectable<VerificationTable>;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const dialect = new PostgresDialect({
  pool,
});

export const db = new Kysely<Database>({
  dialect,
});
