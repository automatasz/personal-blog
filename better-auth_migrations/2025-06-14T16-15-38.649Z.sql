create schema if not exists keyworder;

create table keyworder."user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "role" text not null, "createdAt" timestamp not null, "updatedAt" timestamp not null);

create table keyworder."session" ("id" text not null primary key, "expiresAt" timestamp not null, "token" text not null unique, "createdAt" timestamp not null, "updatedAt" timestamp not null, "ipAddress" text, "userAgent" text, "userId" text not null references keyworder."user" ("id"));

create table keyworder."account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references keyworder."user" ("id"), "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamp, "refreshTokenExpiresAt" timestamp, "scope" text, "password" text, "createdAt" timestamp not null, "updatedAt" timestamp not null);

create table keyworder."verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamp not null, "createdAt" timestamp, "updatedAt" timestamp);

create table keyworder."description" (
  "id" uuid primary key default gen_random_uuid(),
  "job_id" text unique not null,
  "file_id" text not null,
  "keywords" text[],
  "description" text,
  "title" text,
  "user_id" text not null references keyworder."user" (id) on delete cascade,
  "created_at" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);
