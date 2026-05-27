# Architecture

Full reference dump of the `personal-blog` codebase at `/home/user/projects/personal-blog`.

---

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Astro 6 (SSR) + Svelte 5 | 37 .astro files, 12 .svelte files |
| Database | D1 SQLite via Kysely 0.28 + kysely-d1 | No schema (SQLite flat) |
| Auth | better-auth 1.2 | Google OAuth + email/password, role-based (admin/user), SQLite adapter |
| Background jobs | Cloudflare Queues | Single queue: `image-describe`, consumed by standalone Worker |
| AI | OpenAI (GPT-4.1 Nano) | Image description + keyword generation |
| File storage | UploadThing 7.7 | S3-compatible, max 128MB, 100 files |
| CSS | Tailwind 3.4 + Stylus variables | Dark mode via `class` strategy |
| Page transitions | Swup (@swup/astro 1.8) | Cache enabled, containers: `main`, `#toc` |
| Schema validation | Zod | Input validation for actions + Inngest |
| Icons | Iconify (Svelte + Astro) | FA6 brands/regular/solid, Material Symbols |
| Hosting | Cloudflare Workers | SSR via `@astrojs/cloudflare` v13 adapter |
| Fonts | DM Sans (headings), Roboto (body), JetBrains Mono (code) | |

---

## Directory Structure

```
src/
  actions/           # Astro server actions (7 files)
  assets/            # Static images (avatar, banner, gallery)
  components/        # UI components (23 total)
    control/         #   UI controls (4 .astro)
    misc/            #   Misc components (3 .astro)
    widget/          #   Sidebar widgets (5 .astro, 1 .svelte)
  config.ts          # Site config (title, lang, banner, nav, profile, license)
  constants/         # App constants (6 files)
  content/           # Astro content collections (posts + spec/about)
  i18n/              # Internationalization (7 languages)
   layouts/           # Layouts (2 .astro)
   pages/             # Routes (12 entries)
     api/             #   API routes (auth, uploadthing)
     archive/         #   Archive pages (tag, category)
     posts/           #   Blog post reader
  plugins/           # Markdown/rehype plugins (5 files)
  styles/            # Stylesheets (8 files)
  types/             # TypeScript types (2 files)
  utils/             # Utilities (13 files)
```

---

## File Counts

| Type | Count |
|------|-------|
| `.astro` | 37 |
| `.svelte` | 12 |
| `.ts` | 49 |
| `.mjs` / `.js` / `.cjs` | 11 |

---

## Dependencies (production)

### Framework
- `astro` ^6.3.7
- `svelte` ^5.55.9
- `@astrojs/svelte` ^8.1.1
- `@astrojs/cloudflare` ^13.5.4

### Database & Auth
- `kysely` ^0.28.2
- `kysely-d1` — D1 SQLite dialect for Kysely

### Auth
- `better-auth` ^1.2.9

### Background Jobs
- Cloudflare Queues (no extra dependency — uses `@cloudflare/workers-types`)

### AI
- `openai` ^5.3.0

### File Storage
- `uploadthing` ^7.7.2
- `@uploadthing/svelte` ^7.3.2

### Styling
- `tailwindcss` ^3.4.16
- `@astrojs/tailwind` ^6.0.2
- `@tailwindcss/typography` ^0.5.15
- `tailwind-merge` ^3.3.1
- `stylus` ^0.63.0 (CSS variables)

### Markdown / Content
- `@astrojs/rss` ^4.0.12
- `@astrojs/sitemap` ^3.6.0
- `markdown-it` ^14.1.0 (RSS)
- `sanitize-html` ^2.13.1 (RSS)
- `remark-math` ^6.0.0
- `rehype-katex` ^7.0.1
- `rehype-slug` ^6.0.0
- `rehype-components` ^0.3.0
- `rehype-autolink-headings` ^7.1.0
- `remark-directive` ^3.0.0
- `remark-github-admonitions-to-directives` ^1.0.5
- `remark-sectionize` ^2.0.0
- `remark-directive-rehype` ^0.4.2
- `hastscript` ^9.0.0
- `unist-util-visit` ^5.0.0
- `mdast-util-to-string` ^4.0.0
- `reading-time` ^1.5.0
- `sharp` ^0.33.5

### UI
- `@swup/astro` ^1.8.0
- `@iconify/svelte` ^4.0.2
- `@iconify-json/fa6-brands` ^1.2.3
- `@iconify-json/fa6-regular` ^1.2.2
- `@iconify-json/fa6-solid` ^1.2.2
- `@iconify-json/material-symbols` ^1.2.8
- `photoswipe` ^5.4.4
- `pagefind` ^1.3.0
- `overlayscrollbars` ^2.10.1
- `katex` ^0.16.19
- `astro-icon` ^1.1.5
- `astro-compress` ^2.4.1

### Fonts
- `@fontsource-variable/jetbrains-mono` ^5.1.1
- `@fontsource/dm-sans` ^5.2.8
- `@fontsource/roboto` ^5.1.0

### Other
- `zod` ^3.25.64
- `@stylistic/eslint-plugin` ^4.4.1

---

## Database Schema

No schema prefix (D1/SQLite flat namespace). JSON columns stored as TEXT (manually `JSON.parse`/`JSON.stringify` at action boundary).

### `user` (better-auth)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text | |
| email | text | unique |
| emailVerified | integer | SQLite boolean |
| image | text? | |
| role | text | "admin" \| "user" |
| credits | integer | default 0 |
| createdAt | text | ISO 8601 |
| updatedAt | text | ISO 8601 |

### `session` (better-auth)
| Column | Type |
|--------|------|
| id | text PK |
| userId | text FK -> user |
| token | text unique |
| expiresAt | text |
| ipAddress | text? |
| userAgent | text? |
| createdAt | text |
| updatedAt | text |

### `account` (better-auth)
| Column | Type |
|--------|------|
| id | text PK |
| userId | text FK -> user |
| accountId | text |
| providerId | text |
| accessToken | text? |
| refreshToken | text? |
| idToken | text? |
| accessTokenExpiresAt | text? |
| refreshTokenExpiresAt | text? |
| scope | text? |
| password | text? |
| createdAt | text |
| updatedAt | text |

### `verification` (better-auth)
| Column | Type |
|--------|------|
| id | text PK |
| identifier | text |
| value | text |
| expiresAt | text |
| createdAt | text |
| updatedAt | text |

### `description` (app)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | UUID (crypto.randomUUID) |
| file_id | text | UploadThing file ID |
| file_name | text? | |
| keywords | text? | JSON array of strings |
| description | text? | AI-generated |
| title | text? | AI-generated |
| user_id | text FK -> user | |
| batch_id | text | groups related uploads |
| tokens_used | integer? | OpenAI token count |
| result | text? | "success" \| "fail" |
| width | integer? | image width |
| height | integer? | image height |
| created_at | text | ISO 8601 |

### `batch` (app)
| Column | Type |
|--------|------|
| id | text PK |
| title | text? |
| created_at | text |

### `credit_audit` (app)
| Column | Type |
|--------|------|
| id | text PK | UUID (crypto.randomUUID) |
| user_id | text FK -> user |
| amount | integer |
| action | text |
| metadata | text? | JSON object |
| created_at | text |

---

## Auth Flow

### Server (`src/utils/auth.ts`)
- `betterAuth` configured with Kysely SQLite dialect (via `kysely-d1`)
- Flat model names (`user`, `session`, `account`, `verification`)
- Lazy `initAuth(d1, config)` pattern — avoids `astro:env` at module load time
- Proxy-based `auth` singleton: first access triggers init
- User model has `role` additional field (string, default "user", not inputtable)
- Email/password + Google OAuth
- Session cookie cache: 300s
- Cloudflare Workers URL in trusted origins

### API Route (`src/pages/api/auth/[...all].ts`)
- Catch-all handler, sets `x-forwarded-for` header
- Delegates to `auth.handler`

### Client (`src/utils/auth-client.ts`)
- `createAuthClient` from `better-auth/svelte` (for Svelte 5 components)
- `createAuthClient` vanilla (for Astro inline scripts)
- Both use `inferAdditionalFields<typeof auth>()` plugin

### Auth Utility (`src/utils/actions.ts`)
- `checkIfSignedInAndGetUserId(headers, locals)` -- calls `auth.api.getSession()`, throws `ActionError("UNAUTHORIZED")` if not signed in
- `requireAdmin(headers, locals)` — same but also checks `role === "admin"`
- `ensureAuth(locals)` — lazy init auth from `locals.runtime.env` if not yet initialized
- `deductCredits(userId, amount, action, metadata?)` — writes to `credit_audit`, updates user credits (no `FOR UPDATE` — D1 serialized writes make it safe)

---

## Queue Worker Flow

### File
- `src/queue-worker.ts` — standalone Cloudflare Worker (not part of Astro build)

### Queue
- Name: `image-describe`
- Message: `{ fileId: string, descriptionId: string }`
- Dead-letter queue configured in `wrangler-consumer.jsonc`

### Flow
1. User uploads images via UploadThing (client-side)
2. `postFileIds` action creates DB records + sends message to `IMAGE_QUEUE` for each file
3. Deducts credits (7 per image)
4. Queue consumer Worker (deployed separately):
   a. Calls OpenAI GPT-4.1 Nano to generate title, description, 100 keywords from image URL
   b. Saves result to `description` table
   c. Checks if all descriptions in batch are complete
   d. If complete, calls OpenAI to generate batch title from individual image titles
   e. Upserts batch title into `batch` table
5. Client polls `checkEventComplete` action to detect completion

---

## UploadThing Flow

### Files
| File | Purpose |
|------|---------|
| `src/utils/storage.ts` | Server: UTApi, file router, middleware |
| `src/utils/storage-client.ts` | Client: Svelte UploadButton helpers, `minifyImage` |
| `src/components/ImageUploader.svelte` | Upload UI component |

### File Router (`ourFileRouter`)
- Route: `imageUploader`
- Config: image only, max 128MB, max 100 files
- Middleware: checks auth, returns `{ userId }`
- `onUploadComplete`: deducts 1 credit, logs

### Client-side
- `minifyImage()`: downsizes to max 1024px, converts to WebP quality 0.5
- UploadButton + createUploader from `@uploadthing/svelte`
- On upload complete, calls `postFileIds` action

### API Route (`src/pages/api/uploadthing.ts`)
- Exports GET, POST via `createRouteHandler`

---

## Routes

### Pages (SSR, mostly static via prerender)

| Route | File | Prerender | Description |
|-------|------|-----------|-------------|
| `/` + `/page/2` etc. | `[...page].astro` | Static | Paginated blog home |
| `/posts/[...slug]` | `posts/[...slug].astro` | Static | Blog post |
| `/archive/` | `archive/index.astro` | Static | Archive listing |
| `/archive/tag/[tag]` | `archive/tag/[tag].astro` | Static | Posts by tag |
| `/archive/category/[category]` | `archive/category/[category].astro` | Static | Posts by category |
| `/gallery` | `gallery.astro` | SSR (Svelte onMount) | Photo gallery |
| `/keyworder` | `keyworder.astro` | SSR | AI image keyworder |
| `/batch` | `batch.astro` | SSR | Batch results |
| `/my-account` | `my-account.astro` | `false` | User stats/batches |
| `/sign-in` | `sign-in.astro` | SSR | Sign in form |
| `/about` | `about.astro` | Static | About page |
| `/rss.xml` | `rss.xml.ts` | SSR | RSS feed |
| `/robots.txt` | `robots.txt.ts` | SSR | Robots.txt |

### API Routes

| Route | File | Method |
|-------|------|--------|
| `/api/auth/[...all]` | `api/auth/[...all].ts` | ALL |
| `/api/uploadthing` | `api/uploadthing.ts` | GET, POST |

---

## Server Actions (7)

Defined in `src/actions/`, exported via `src/actions/index.ts` as `server`.

| Action | Input | Output | Auth Required |
|--------|-------|--------|---------------|
| `getBatch` | `batchId: string` | Batch + descriptions | Yes |
| `checkEventComplete` | `batchId: string` | Completion status | Yes |
| `getBatches` | none | All user's batches with counts | Yes |
| `postFileIds` | `files: {id, name, width, height}[]` | batchId | Yes |
| `getStats` | none | batch/image/token/credit stats | Yes |
| `updateDescription` | `id, title?, description?, keywords?` | updated description | Yes |
| `regenerateDescription` | `id: string` | updated description | Yes |

---

## Svelte Components (12)

| Component | File | Purpose |
|-----------|------|---------|
| `Keyworder.svelte` | `components/Keyworder.svelte` | Main AI keyworder tool page logic |
| `ImageUploader.svelte` | `components/ImageUploader.svelte` | Upload UI with UploadThing |
| `ImageDescriptions.svelte` | `components/ImageDescriptions.svelte` | View/edit AI descriptions |
| `BatchList.svelte` | `components/BatchList.svelte` | List user's batches |
| `CounterOfBatchesAndImages.svelte` | `components/CounterOfBatchesAndImages.svelte` | Stats counter |
| `MasonryGallery.svelte` | `components/MasonryGallery.svelte` | Photo gallery layout |
| `Search.svelte` | `components/Search.svelte` | Pagefind search UI |
| `LightDarkSwitch.svelte` | `components/LightDarkSwitch.svelte` | Theme toggle |
| `UserSessionCard.svelte` | `components/UserSessionCard.svelte` | User card with auth |
| `UserSessionSwitch.svelte` | `components/UserSessionSwitch.svelte` | Login/logout switch |
| `DisplaySettings.svelte` | `components/widget/DisplaySettings.svelte` | Theme color/hue picker |
| `ImageWithLoading.svelte` | `components/ImageWithLoading.svelte` | Lazy-loaded image |

---

## Astro Components (37, partial list)

### Layouts
- `Layout.astro` -- HTML shell, fonts, meta, theme script, scrollbar, swup, photoswipe
- `MainGridLayout.astro` -- Navbar + banner + sidebar + main content grid

### Widgets (sidebar)
- `Profile.astro`, `Tags.astro`, `Categories.astro`, `TOC.astro`, `NavMenuPanel.astro`, `SideBar.astro`, `WidgetLayout.astro`

### Controls
- `BackToTop.astro`, `ButtonLink.astro`, `ButtonTag.astro`, `Pagination.astro`

### Misc
- `ImageWrapper.astro`, `License.astro`, `Markdown.astro`
- `PostCard.astro`, `PostMeta.astro`, `PostPage.astro`
- `Navbar.astro`, `Footer.astro`, `ArchivePanel.astro`
- `ConfigCarrier.astro`, `GlobalStyles.astro`, `PostHog.astro`

---

## Configuration

### Astro Config (`astro.config.mjs`)
- SSR via Cloudflare Workers adapter (v13)
- Tailwind with nesting
- Swup: cache=true, containers=["main", "#toc"], smooth scrolling, preloading
- Icon sets: fa6-brands, fa6-regular, fa6-solid
- Svelte integration
- Sitemap
- Compress (CSS: false, Image: false)
- Markdown: 6 remark plugins, 6 rehype plugins
- Image: constrained layout
- 13 env vars (9 server secret, 4 client public)

### TypeScript (`tsconfig.json`)
- Strict mode, `noUnusedLocals: true`, `declaration: true`
- Path aliases: `@/*`, `@components/*`, `@assets/*`, `@constants/*`, `@utils/*`, `@i18n/*`, `@layouts/*`

### ESLint (`eslint.config.js`)
- Flat config
- Double quotes, semicolons, trailing commas, indent 2
- `_`-prefixed vars exempt from no-unused-vars
- Overrides for .astro, .svelte, .ts
- Plugins: eslint-plugin-astro, eslint-plugin-svelte, @stylistic/eslint-plugin, typescript-eslint

### Tailwind (`tailwind.config.cjs`)
- Content: astro/html/js/md/svelte/ts/vue files
- Dark mode: `class`
- Fonts: Roboto (sans), DM Sans (heading)
- Plugin: `@tailwindcss/typography`

### Env Vars (via `astro:env` schema)
| Var | Context | Access |
|-----|---------|--------|
| `POSTHOG_API_KEY` | client | public |
| `POSTHOG_API_HOST` | client | public |
| `UPLOADTHING_APP_ID` | client | public |
| `OPENAI_API_KEY` | server | secret |
| `GOOGLE_AUTH_CLIENT_ID` | server | secret |
| `GOOGLE_AUTH_CLIENT_SECRET` | server | secret |
| `UPLOADTHING_TOKEN` | server | secret |
| `CF_PAGES_URL` | server | secret, optional |

---

## i18n

- 7 languages: en, es, ja, ko, th, zh_CN, zh_TW
- 28 translation keys (enum `I18nKey`)
- Resolver: `getTranslation(lang)` returns `Translation` object
- Static shortcut: `i18n(key)` uses `siteConfig.lang`
- Site default: `en`

---

## Constants

### Site (`src/config.ts`)
- `siteConfig`: title, subtitle, lang, themeColor, banner, toc, favicon
- `navBarConfig`: links preset (Home, Archive, Gallery, Keyworder)
- `profileConfig`: avatar, name, bio, social links
- `licenseConfig`: CC BY-NC-SA 4.0

### App (`src/constants/constants.ts`)
- `PAGE_SIZE`: 8
- `LIGHT_MODE`, `DARK_MODE`, `AUTO_MODE`
- `DEFAULT_THEME`: AUTO_MODE
- `BANNER_HEIGHT`: 35vh
- `BANNER_HEIGHT_EXTEND`: 30vh
- `MAIN_PANEL_OVERLAPS_BANNER_HEIGHT`: 3.5rem
- `PAGE_WIDTH`: 75rem

### Credit Costs (`src/constants/credit-costs.ts`)
- `CREDIT_COST_UPLOAD`: 1
- `CREDIT_COST_DESCRIBE`: 7
- `CREDIT_COST_REGENERATE`: 5

### AI (`src/constants/ai.ts`)
- `AI_MODEL`: "gpt-4.1-nano"

---

## Key Patterns

### Credit System
- Atomic deduction via `db.transaction()` (D1 serialized writes — no `FOR UPDATE` needed)
- Audit trail in `credit_audit` table
- Used by: upload (1), describe (7), regenerate (5)

### Background Job Pattern
1. Client uploads files via UploadThing
2. `postFileIds` action creates DB records + sends queue messages
3. Queue consumer Worker processes image via OpenAI, saves results
4. When batch complete, generates batch title
5. Client polls `checkEventComplete` action

### Page Transitions (Swup)
- `cache: true` -- SSR queries do NOT re-run on client nav
- Svelte components use `onMount` + `actions.*` for fresh data
- Update containers: `main` + `#toc`
- Banner height, sidebar visibility, TOC, scroll position managed via Swup hooks

### Astro Server Actions
- Defined with `defineAction` + Zod input validation
- Called from Astro pages via `Astro.callAction` or Svelte via `actions.*`
- Protected actions call `checkIfSignedInAndGetUserId()` first
- Errors: `ActionError` with code + message

---

## Migrations

### `d1-migrations/`
- `0000_init.sql` -- Creates all tables: user, session, account, verification, description, batch, credit_audit

Apply with: `pnpm wrangler d1 migrations apply fuwari-db`

---

## Scripts

| Script | Command |
|--------|---------|
| `dev` | `astro dev --host` |
| `build` | `astro build && pagefind --site dist` |
| `deploy` | `wrangler deploy` |
| `deploy:consumer` | `wrangler deploy --config wrangler-consumer.jsonc` |
| `type-check` | `tsc --noEmit --isolatedDeclarations` |
| `new-post` | `node scripts/new-post.js` |
| `cleanup-orphans` | `UPLOADTHING_TOKEN=... npx tsx scripts/cleanup-orphaned-uploads.ts` |

---

## Database Access Pattern

### Lazy Initialization
Both `db` and `auth` are lazily initialized via Proxy pattern:
- `src/utils/db.ts`: `initDb(d1)` stores D1 binding, Proxy forwards to underlying Kysely instance
- `src/utils/auth.ts`: `initAuth(d1, config)` stores binding + config, Proxy forwards to `better-auth` instance
- Initialized in middleware (`src/middleware.ts`) and on-demand in action handlers (`src/utils/actions.ts`)

### Key Differences from PostgreSQL
| PG Feature | D1 Equivalent |
|------------|---------------|
| `keyworder.schema` prefix | No schema — flat table names |
| `gen_random_uuid()` | `crypto.randomUUID()` in JS |
| `now()` / `NOW()` | `CURRENT_TIMESTAMP` (SQLite) |
| `FILTER (WHERE ...)` | `CASE WHEN ... END` |
| `::jsonb` cast | TEXT column + `JSON.parse()` |
| `FOR UPDATE` row lock | Not needed — D1 serializes writes |
| `text[]` array type | TEXT column with JSON array string |
| `RETURNING` | Supported natively in SQLite 3.35+ |
| `timestamptz` | TEXT column with ISO 8601 string |

## Separate Queue Consumer Worker

The queue consumer (`src/queue-worker.ts`) is deployed as a **separate Worker** from the Astro SSR Worker. This avoids `@astrojs/cloudflare` incompatibility with `queues.consumers` in `wrangler.jsonc`.

- Astro Worker (`wrangler.jsonc`): only has `queues.producers` — sends messages to `image-describe` queue
- Consumer Worker (`wrangler-consumer.jsonc`): has `queues.consumers` — processes messages with direct D1 access
- Both Workers share the same `DB` D1 binding and secrets

## Swup Cache Behavior

Svelte components that fetch data via Astro actions on client navigation:
- `Keyworder.svelte` -- polls `checkEventComplete`
- `ImageDescriptions.svelte` -- fetches batch data
- `BatchList.svelte` -- fetches batch list
- `CounterOfBatchesAndImages.svelte` -- fetches stats
- `Search.svelte` -- pagefind (client-side index)

This is because Swup `cache: true` means SSR doesn't re-run on client nav.