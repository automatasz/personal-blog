CREATE TABLE keyworder."credit_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES keyworder."user" ("id"),
  "amount" integer NOT NULL,
  "action" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
