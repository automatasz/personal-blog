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
  description: DescriptionTable;
}

export interface DescriptionTable {
  id: Generated<string>;
  job_id: string;
  file_url: string;
  keywords: string[] | null;
  description: string | null;
  title: string | null;
  user_id: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export type Description = Selectable<DescriptionTable>;
export type NewDescription = Insertable<DescriptionTable>;
export type DescriptionUpdate = Updateable<DescriptionTable>;

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
