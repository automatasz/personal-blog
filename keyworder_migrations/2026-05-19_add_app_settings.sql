CREATE TABLE keyworder."app_settings" (
  "key" text PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" text REFERENCES keyworder."user" ("id")
);

INSERT INTO keyworder."app_settings" ("key", "value") VALUES
  ('credit_costs', '{"upload":1,"describe":7,"regenerate":5}');
