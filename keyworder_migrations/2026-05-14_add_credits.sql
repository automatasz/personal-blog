ALTER TABLE keyworder."user" ADD COLUMN "credits" integer NOT NULL DEFAULT 0;
-- Seed existing admins with 200 credits (100 images x 2 credits each: upload + describe)
UPDATE keyworder."user" SET "credits" = 200 WHERE "role" = 'admin';
