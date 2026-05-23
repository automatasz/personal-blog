# Repo Rules

- Dev server is always running already. Do NOT start, restart, kill, or manage the dev server in any way.
- Prefer pnpm over npm.

## Stack

- **Framework**: Astro 5 SSR (Vercel) + Svelte 5 (client interactivity)
- **Database**: PostgreSQL via Kysely (typed query builder, not ORM)
- **CSS**: Tailwind 3.4 + Stylus variables
- **Auth**: better-auth (Google OAuth + email/password), role-based (admin/user)
- **Background jobs**: Inngest (event `keyworder/image.describe`)
- **AI**: OpenAI (GPT-4.1 Nano)
- **File storage**: UploadThing (S3-compatible)
- **Page transitions**: Swup (@swup/astro, cache enabled)
- **Schema validation**: Zod

## Key Commands

- `pnpm dev` — start dev server (already running, do not run)
- `pnpm build` — full build
- `pnpm type-check` — `tsc --noEmit`
- `pnpm astro build` — build without pagefind

## Database

- All tables in `keyworder` schema
- `keyworder_migrations/` for app migrations
- `better-auth_migrations/` for auth table migrations
- Connection: `DATABASE_URL` env var, SSL `rejectUnauthorized: false`

## TypeScript

- Strict mode, `noUnusedLocals: true`
- Path aliases: `@/*`, `@components/*`, `@utils/*`, `@constants/*`, `@i18n/*`, `@layouts/*`
- Linting with ESLint flat config (double quotes, semicolons, trailing commas, indent 2)

## Component Conventions

- `.astro` = server/static, `.svelte` = client interactive (Svelte 5 runes)
- Layouts: `Layout.astro` (HTML shell) → `MainGridLayout.astro` (nav, sidebar, footer, grid)
- `HIDE_SIDEBAR_LINKS` in `src/constants/hide-sidebar-links.ts` controls sidebar visibility
- `src/actions/` for Astro server actions, exported via `index.ts`
- `src/components/widget/` = sidebar widgets, `src/components/control/` = UI controls

## i18n

- 7 languages in `src/i18n/languages/`
- Key-based translation via `translation.ts` resolver
- Site `lang` in `src/config.ts`

## Notable Gotchas

- Swup `cache: true` means SSR queries don't re-run on client nav — use `onMount` fetch via Astro actions if data must be fresh
- Inngest local dev requires `INNGEST_DEV=1` env
- Content collection posts in `src/content/posts/<date>-<slug>/index.md`
- **No test framework** — no jest/vitest/playwright setup exists
- Environment vars via `astro:env` schema (server `secret` / client `public`) — don't use raw `process.env`
- ESLint enforces: double quotes, semicolons, trailing commas, indent 2, no unused vars (`_`-prefixed exempt)
- Credit system: atomic deduction with `FOR UPDATE` row lock + `credit_audit` trail
- Post frontmatter: `title`, `published` (date), `updated?`, `draft?`, `description?`, `image?`, `tags?` (string[]), `category?`, `lang?`, prev/next title+slug

## Agent skills

### Issue tracker

GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — CONTEXT.md + docs/adr/ at repo root. See `docs/agents/domain.md`.`
