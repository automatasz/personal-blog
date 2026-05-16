# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server at localhost:4321
pnpm build            # Production build + pagefind search index
pnpm preview          # Preview production build
pnpm type-check       # TypeScript check (tsc --noEmit)
pnpm new-post <name>  # Scaffold new blog post
pnpm eslint .         # Lint (no script alias - eslint.config.js flat config)
```

## Architecture

Astro 5 static site (SSG) with selective SSR via Vercel adapter — API routes run as serverless functions.

### Three Services Stack

1. **Better Auth** — email/password + Google OAuth. Tables live under `keyworder` schema in PostgreSQL. Auth API at `/api/auth/[...all]`. Session cookie caching enabled (300s).
2. **Inngest** — background job runner. The `describeImage` function calls OpenAI (gpt-4.1-nano) to generate titles/descriptions/keywords for uploaded images. Webhook at `/api/inngest`. Self-hosted dev server at `localhost:8288`.
3. **UploadThing** — handles image uploads for the keyworder tool. File router at `/api/uploadthing`. Svelte client-side component triggers uploads.

### Data Flow (Keyworder Feature)

1. User uploads images via UploadThing Svelte component (`src/components/ImageGrid.svelte`)
2. File IDs posted to Astro Action `postFileIds` → inserts rows into `keyworder.description` table (Kysely), dispatches Inngest event per file
3. Inngest function `describeImage` fetches image from UploadThing URL, sends to OpenAI, updates DB row with results
4. Results surfaced via Astro Actions: `getBatch`, `getBatches`, `getStats`, `getAllDescriptions`, `checkEventComplete`
5. All server-side logic uses Astro Actions (`src/actions/`) — no manually defined REST endpoints

### Key Source Layout

```
src/
  actions/        # Astro Actions (server functions) — the API layer
  inngest/        # Inngest client + describe-image function
  utils/
    db.ts         # Kysely instance + table type definitions (keyworder.*)
    auth.ts       # Better Auth config (Google OAuth, PostgreSQL dialect)
    storage.ts    # UploadThing file router
    ai.ts         # OpenAI client wrapper
  components/     # Astro + Svelte components
    control/      # Buttons, pagination
    misc/         # License, image, markdown rendering
    widget/       # Sidebar, profile, tags, TOC, nav
  content/
    posts/        # Blog posts (markdown, Astro content collection)
    config.ts     # Content collection schema
  pages/          # File-based routes
  plugins/        # remark/rehype plugins for markdown processing
  config.ts       # Site config (title, theme, nav, profile, license)
```

### Database

PostgreSQL on Neon. All custom tables under `keyworder` schema. Kysely provides type-safe queries — table types in `src/utils/db.ts`. Better Auth manages its own tables (`keyworder.user`, `keyworder.session`, `keyworder.account`, `keyworder.verification`). The app table is `keyworder.description` (image metadata + AI results).

### Auth Guards

Server-side actions check auth via `auth.api.getSession({ headers })` from Better Auth. Not exposed as middleware — each action calls it inline. Components use `better-auth/svelte` client helpers (`signIn`, `signOut`, `useSession`).

### No Tests

This project has no test suite or test framework configured.
