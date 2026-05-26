# Handoff: Fix Cloudflare Deployment Errors

## Context
Personal blog (Astro 6 SSR + Svelte 5) deployed to Cloudflare Workers via `@astrojs/cloudflare` adapter + `wrangler deploy`. Recently migrated from Vercel/Neon to Cloudflare Workers/D1. Site is live but broken.

## Active Errors (from browser console)
1. `404 /pagefind/pagefind.js` -- search index not served
2. `500 /api/auth/get-session` -- auth endpoint throws
3. `500 /api/auth/sign-in/social` -- OAuth sign-in throws
4. `ReferenceError: pagefind is not defined` -- cascade from #1
5. `console.warn("Animation element not found")` -- harmless TOC widget warning

## Root Causes

### Pagefind 404
`build` script runs `pagefind --site dist` which writes to `dist/pagefind/`. Cloudflare worker ASSETS binding serves from `dist/client/` (set in `dist/server/wrangler.json` assets.directory = `"../client"`). Mismatched directories.

Relevant files: `package.json:8`, `dist/server/wrangler.json`

### Auth 500
Deployed commit `be20918` uses old Astro 6 pattern `locals.runtime.env` which throws in Cloudflare adapter (the getter was removed). Uncommitted fixes already exist in working tree -- they switch to `import { env } from "cloudflare:workers"`.

Changed files (uncommitted):
- `src/pages/api/auth/[...all].ts`
- `src/middleware.ts`
- `src/utils/actions.ts`
- `src/actions/postFileIds.ts`
- `src/actions/updateDescription.ts`

### "Animation element not found"
Harmless warning from `<table-of-contents>` web component on pages without `.prose` class. No fix needed.

## Fix Steps

1. Edit `package.json:8`: `pagefind --site dist` -> `pagefind --site dist/client`
2. Commit the 5 uncommitted files
3. Verify Cloudflare secrets are set (GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, OPENAI_API_KEY, UPLOADTHING_TOKEN) -- see `astro.config.mjs:121-132` for full list
4. Run `pnpm build && pnpm deploy`
5. Test site

## Sensitive Info (redacted)
- All credentials, API keys, and tokens redacted. See `.env` and `wrangler.jsonc` in workspace.

## Suggested Skills
- `caveman` for concise execution mode
- `diagnose` if errors persist after applying fixes

## Related Artifacts
- `git diff HEAD` -- all uncommitted fixes
- `wrangler.jsonc` -- CF bindings config
- `astro.config.mjs` -- Astro/Cloudflare adapter config
