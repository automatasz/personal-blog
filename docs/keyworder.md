# Keyworder

A credit-gated tool for bulk-uploading images, generating AI-powered SEO metadata (titles, descriptions, keywords), and exporting the results for stock photography platforms. Available to all signed-in users with sufficient credits.

## What it does

1. **Image upload and pre-processing** — Images are selected through an upload dialog (UploadThing `UploadButton`), resized to max 1024px and converted to WebP (quality 0.5) on the client via `OffscreenCanvas` and `createImageBitmap` before upload to reduce storage and AI processing costs.
2. **AI description generation** — Each image is sent to OpenAI GPT-4.1 Nano (Responses API, `openai.responses.parse`), which returns a compelling title, a long description, and 100 SEO keywords optimized for stock photography sites. Uses Zod structured output via `zodTextFormat`.
3. **Batch title generation** — Once all images in a batch are described, a second AI call generates a single compelling title that suits the collection.
4. **Review and editing** — Results are displayed in a gallery with PhotoSwipe lightbox. Titles, descriptions, and keywords can be edited in-place. Individual descriptions can be regenerated.
5. **Export** — Keywords can be copied per image (client-side clipboard), and the entire batch can be downloaded as an Adobe Stock CSV (Filename, Title, Keywords, Category, Releases).
6. **Batch history** — All past batches are listed with their titles, image counts, and dates.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Svelte 5 runes)                   │
│  Keyworder.svelte ── ImageUploader.svelte ── BatchList.svelte    │
│                        ImageDescriptions.svelte                  │
│                        ImageWithLoading.svelte                   │
│                        UserSessionCard.svelte                    │
│  (PhotoSwipe lightbox)  (Iconify Lucide/Material Symbols)        │
└──────────────────┬───────────────────────────────────────────────┘
                   │ Astro Actions (RPC-like server calls)
┌──────────────────▼───────────────────────────────────────────────┐
│                 BACKEND (Astro Actions)                          │
│  postFileIds, getBatch, getBatches, checkEventComplete,          │
│  updateDescription, regenerateDescription, getStats              │
└──────┬──────────────────────┬────────────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐    ┌─────────────────────────┐
│   Database   │    │   Inngest (queue)        │
│  PostgreSQL  │◄───│  keyworder/image.describe│
│  (keyworder  │    │  (1 retry, 3-4 steps)    │
│   schema)    │    └──────────┬───────────────┘
└──────────────┘               │
                               ▼
                     ┌─────────────────┐
                     │  OpenAI GPT-4.1 │
                     │  Nano           │
                     │  (Responses API)│
                     │  detail: "low"  │
                     └─────────────────┘
```

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 SSR (Vercel) + server actions |
| Frontend | Svelte 5 (runes mode: `$state`, `$derived`, `$props`, `$effect`) |
| Database | PostgreSQL via Kysely (typed query builder, `keyworder` schema) |
| Auth | better-auth (Google OAuth + email/password, role-based, cookie cache 5 min) |
| File storage | UploadThing (S3-compatible CDN, 128MB max, 100 files max) |
| Background jobs | Inngest (event-driven, durable execution, 1 retry) |
| AI | OpenAI GPT-4.1 Nano with structured output (Zod) via Responses API |
| Lightbox | PhotoSwipe (wheel-to-zoom, tap-to-close, custom close SVG) |
| Icons | Iconify (Lucide + Material Symbols) |
| Image pre-processing | Client-side `createImageBitmap` + `OffscreenCanvas` -> WebP |
| CSS | Tailwind 3.4 + CSS variables + `tailwind-merge` for UploadThing styles |
| Transitions | Svelte `fly` and `slide` |
| Schema validation | Zod (Astro `astro:schema` for actions, standalone for AI output) |
| Page transitions | Swup (@swup/astro, cache enabled) |

## Navigation integration

- Nav bar has Keyworder link (`/keyworder/`) via `LinkPreset.Keyworder` in `src/config.ts:42`. Has `requiresAuth: true` in `src/constants/link-presets.ts:25`.
- Sidebar links hidden on `/keyworder` and `/batch` via `HIDE_SIDEBAR_LINKS` in `src/constants/hide-sidebar-links.ts`.
- i18n keys: `I18nKey.keyworder` ("Keyworder") and `I18nKey.batch` ("Keywording results") across 7 languages (en, zh_CN, zh_TW, ja, ko, es, th).

## Database schema

All tables in `keyworder` schema.

### `keyworder.description`
Stores each image and its generated metadata. The original migration (2025-06-14) created this with a `job_id` column; subsequent app-level DDL added `batch_id`, `file_name`, `width`, `height`, `result`, `tokens_used` and dropped `job_id`.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK (`gen_random_uuid()`) | Auto-generated |
| `file_id` | text | UploadThing file key |
| `file_name` | text | Original filename |
| `keywords` | text[] | Array of ~100 SEO keywords |
| `description` | text | AI-generated long description |
| `title` | text | AI-generated title |
| `user_id` | text FK | Links to `keyworder.user` (`on delete cascade`) |
| `batch_id` | text | UUID shared by all images in a batch |
| `tokens_used` | int | OpenAI tokens consumed |
| `result` | text | `"success"` or `"fail"` (nullable while pending) |
| `width` | int | Image width in pixels |
| `height` | int | Image height in pixels |
| `created_at` | timestamp | Row creation time (`default now()`) |

### `keyworder.batch`
Stores the generated title for a completed batch.

| Column | Type | Description |
|---|---|---|
| `id` | text PK | Same UUID as `description.batch_id` |
| `title` | text | AI-generated collection title |
| `created_at` | timestamp | Row creation time |

### `keyworder.user`
Auth table managed by better-auth, with an additional business column for credits.

| Column | Type | Description |
|---|---|---|
| `id` | text PK | User ID |
| `name` | text | Display name |
| `email` | text UNIQUE | Email address |
| `emailVerified` | boolean | Email verification status |
| `image` | text | Avatar URL |
| `role` | text | `"admin"` or `"user"` |
| `credits` | int | Remaining credit balance (default 0, admin seed 200) |
| `createdAt` | timestamp | Account creation time |
| `updatedAt` | timestamp | Last update time |

### `keyworder.credit_audit`
Credit transaction trail. Created by migration `2026-05-14_add_credit_audit.sql`.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK (`gen_random_uuid()`) | Auto-generated |
| `user_id` | text FK | Reference to `keyworder.user` |
| `amount` | integer | Negative for deductions, positive for grants |
| `action` | text | Describes the action (e.g. `"upload"`, `"describe"`, `"regenerate"`) |
| `metadata` | jsonb | Arbitrary context (e.g. `{fileKey, batchId, descriptionId}`) |
| `created_at` | timestamp | Row creation time (`default now()`) |

### `keyworder.session`, `keyworder.account`, `keyworder.verification`
Auth tables managed by better-auth.

### Migrations

| File | Content |
|---|---|
| `better-auth_migrations/2025-06-14T16-15-38.649Z.sql` | Creates `keyworder` schema + initial `user`, `session`, `account`, `verification`, `description` |
| `keyworder_migrations/2026-05-14_add_credits.sql` | Adds `credits` column to `keyworder.user` (default 0), seeds admins with 200 |
| `keyworder_migrations/2026-05-14_add_credit_audit.sql` | Creates `credit_audit` table |

## End-to-end flow

### Step 1: Upload
1. User visits `/keyworder`, rendered by `Keyworder.svelte` inside `keyworder.astro` (using `MainGridLayout`).
2. `ImageUploader.svelte` renders UploadThing `UploadButton` when credits > 0. On file selection, `onBeforeUploadBegin` runs `minifyImage()` on each file.
3. `minifyImage()` (`src/utils/storage-client.ts`): uses `createImageBitmap` to decode, calculates aspect-ratio-preserving scale (max 1024px on longest side), draws to `OffscreenCanvas`, converts to WebP via `canvas.convertToBlob({ type: "image/webp", quality: 0.5 })`, returns `{ file: File, width, height, originalSize }`.
4. UploadThing's `imageUploader` route (`src/utils/storage.ts`) validates session via middleware, returns `{ userId }`. Limits: `maxFileSize: "128MB"`, `maxFileCount: 100`.
5. `onUploadComplete` deducts 1 credit via `deductCredits(userId, CREDIT_COST_UPLOAD, "upload", { fileKey })`.
6. After upload, `onClientUploadComplete` maps response to `FileForUpload[]`. Selected images appear in a gallery. User can remove individual images or clear all (no credit refund). Credits refreshed from server.

### Step 2: Submit for description
7. User clicks "Describe". `ImageUploader.svelte` calls `actions.postFileIds()` with each file's UploadThing key, name, width, height.
8. **`postFileIds` action** (`src/actions/postFileIds.ts`):
   - Validates session via `checkIfSignedInAndGetUserId()`.
   - Generates `batchId` UUID via `crypto.randomUUID()`.
   - Inserts one row per file into `keyworder.description` with `batch_id`.
   - Fires one `keyworder/image.describe` Inngest event per image (each carries `fileId` + `descriptionId`). Sent in parallel via `Promise.all`.
   - On Inngest failure: cleans up (deletes DB rows + calls `uploadthing.deleteFiles`).
   - Deducts `files.length * CREDIT_COST_DESCRIBE` credits atomically via `deductCredits()`.
   - Returns the `batchId`.
9. Browser navigates to `/batch?id=<batchId>` via Astro `navigate()`.

### Step 3: Background AI processing
10. **`image-describe` Inngest function** (`src/inngest/describe-image.ts`, `retries: 1`, listens to `keyworder/image.describe`):

    - **Step "openai.wrap.image.describe"**: Calls OpenAI GPT-4.1 Nano with image URL (`https://<appId>.ufs.sh/f/<fileId>`, `detail: "low"`) and SEO prompt. Uses `zodTextFormat(descriptionSchema)` for structured JSON.
    - **Step "image.save"**: Persists response to `keyworder.description`. Sets `result` to `"success"` or `"fail"`. Stores `tokens_used`. Checks if all descriptions in batch are done via `getBatchSuccessCount()`. If fully done, fetches all titles for batch-title gen.
    - **Step "openai.wrap.batch.title"** (conditional): Calls OpenAI with newspaper-writer prompt + individual titles (newline-separated). Uses `zodTextFormat(batchSchema)`.
    - **Step "batch.complete"** (conditional): Inserts batch title into `keyworder.batch`. Handles unique constraint violations gracefully (`error.code === "23505"` -- silent skip).

### Step 4: Results display
11. `ImageDescriptions.svelte` mounts on `/batch` and calls `actions.getBatch()`.
12. If descriptions aren't ready (no `result` field), polls `actions.checkEventComplete()` every 5 seconds, up to 5 attempts (~25s total).
13. Each image card shows: thumbnail (click opens PhotoSwipe lightbox), title, filename, description, failure indicator (red warning if `result !== "success"`), keywords (first 10 visible, "Show more" toggle with `slide` transition).
14. PhotoSwipe config: `padding: 20`, `wheelToZoom: true`, `arrowPrev/arrowNext: false`, `imageClickAction: "close"`, `tapAction: "close"`, `doubleTapAction: "zoom"`, custom close SVG.
15. Sticky header with batch title + "Export CSV" button.

### Step 5: Editing and export
16. **In-place editing**: Pencil icon switches to edit mode (input fields for title, description, comma-separated keywords in textarea). `slide` transition. Save calls `actions.updateDescription()` -- validates session, updates row (0 credits).
17. **Regeneration**: Refresh icon calls `actions.regenerateDescription()` -- verifies ownership, calls OpenAI synchronously via `openai.responses.parse` (bypasses Inngest), deducts `CREDIT_COST_REGENERATE` credits, updates DB.
18. **Copy keywords**: Per-image button copies all keywords as comma-separated string via `navigator.clipboard.writeText()`.
19. **Adobe Stock CSV**: Client-side Blob generation. Columns: `Filename`, `Title`, `Keywords`, `Category` (always `"3"`), `Releases` (empty). Escapes commas and quotes (double-quote wrapping with `""` escaping).

### Statistics display
`Keyworder.svelte` shows a 4-card stats grid (Batches, Images, Tokens formatted as K/M, Credits) with pulsating skeleton placeholders during load. Fetched via `actions.getStats()`.

## Credit system

### Credit deduction (`deductCredits` in `src/utils/actions.ts`)
Atomic deduction inside a Kysely transaction with `FOR UPDATE` row lock:
1. Selects user's current credits with `FOR UPDATE` (row-level lock).
2. Throws `ActionError` with `code: "FORBIDDEN"` if insufficient.
3. Decrements via `eb("credits", "-", amount)`.
4. Inserts row into `credit_audit` with `user_id`, negative `amount`, descriptive `action`, `metadata`.

### Cost constants (`src/constants/credit-costs.ts`)

| Action | Constant | Cost | Deduction timing |
|---|---|---|---|
| Upload | `CREDIT_COST_UPLOAD` | 1 credit | `onUploadComplete` callback |
| Describe (batch) | `CREDIT_COST_DESCRIBE` | 7 credits/image | After Inngest events dispatched |
| Regenerate | `CREDIT_COST_REGENERATE` | 5 credits | After AI response received |
| Edit | -- | 0 credits | N/A |
| View | -- | 0 credits | N/A |

Upload UI shows `totalCost = files.length * CREDIT_COST_DESCRIBE` and insufficient credit warnings with per-image removal suggestion. No refunds for removed images or failed descriptions.

## Authorization

All actions require valid session, verified by `checkIfSignedInAndGetUserId()` in `src/utils/actions.ts` (calls `auth.api.getSession({ headers })`, throws `UNAUTHORIZED`).

Write operations (`postFileIds`, `regenerateDescription`, upload `onUploadComplete`) additionally call `deductCredits()`.

Edit operations (`updateDescription`) verify ownership by filtering on both `id` AND `user_id`. Returns `FORBIDDEN` if no row updated.

Nav link has `requiresAuth: true`.

## AI prompts

**Model**: `gpt-4.1-nano` (`src/constants/ai.ts`). **API**: OpenAI Responses API (`openai.responses.parse`) with `zodTextFormat` for structured JSON.

**Per-image prompt:**
> You are a photography and SEO expert. You must generate 100 short, relevant keywords for an uploaded image. Use 100 popular and descriptive keywords that help rank the image higher in stock websites. In addition, create a compelling title and a long description that suit the image well

Image sent with `detail: "low"`. Parsed with `descriptionSchema` (`{ title: string, description: string, keywords: string[] }`).

**Batch title prompt:**
> You are a newspaper writer who is an expert at their job. You are given a collection of image titles. Your task is to create a compelling title that suits the collection of these images well

Followed by individual titles, one per line. Parsed with `batchSchema` (`{ title: string }`).

## File inventory

### Pages
- `src/pages/keyworder.astro` -- Main page at `/keyworder`. `MainGridLayout`, hero with 4-step guide, renders `KeyworderSvelte` `client:load`.
- `src/pages/batch.astro` -- Batch results at `/batch?id=<uuid>`. `MainGridLayout`, "Upload" link back, passes `UPLOADTHING_APP_ID` to `ImageDescriptions` `client:load`.
- `src/pages/api/inngest.ts` -- Inngest webhook (GET, POST, PUT). `prerender = false`.
- `src/pages/api/uploadthing.ts` -- UploadThing webhook (GET, POST). `prerender = false`.

### Components (Svelte 5 runes)
- `src/components/Keyworder.svelte` -- Root: session gate, stats grid with skeletons, `ImageUploader` + `BatchList`.
- `src/components/ImageUploader.svelte` -- Upload UI: UploadThing button, credit/cost display, selected file gallery with remove/clear, submit, loading/error states, insufficient-credit warnings.
- `src/components/BatchList.svelte` -- Batch history with title, image count, relative time (`daysAgo`/`getTime` from `@utils/date-utils`). Links to `/batch?id=<uuid>`.
- `src/components/ImageDescriptions.svelte` -- Gallery: polling, PhotoSwipe, edit/regenerate per-image, inline forms, keyword copy, CSV download. Sticky header.
- `src/components/ImageWithLoading.svelte` -- Image loader with shimmer skeleton (`@keyframes shimmer`), lazy loading, error fallback (`fail-picture` icon), aspect-ratio-aware padding.
- `src/components/UserSessionCard.svelte` -- Sign-in (Google OAuth, `callbackURL: "/keyworder"`) / sign-out button. Uses `authClient.useSession()`.

### Actions (Astro server, exported via `src/actions/index.ts`)
- `src/actions/postFileIds.ts` -- Insert rows, dispatch Inngest events, deduct credits. Rolls back on failure.
- `src/actions/getBatch.ts` -- Fetch descriptions + batch title by `batchId`/`userId`.
- `src/actions/getBatches.ts` -- List completed batches aggregated with COUNT, MIN, grouped by batch_id.
- `src/actions/checkEventComplete.ts` -- Poll: compare non-null result count vs total.
- `src/actions/getStats.ts` -- Aggregate stats: batch count, image count, token sum, current credits.
- `src/actions/updateDescription.ts` -- Two exports: `updateDescription` (edit, 0 credits) and `regenerateDescription` (sync AI + credit deduction + DB update).

### Inngest
- `src/inngest/client.ts` -- Client with `id: "keyworder"`.
- `src/inngest/types.ts` -- Zod schemas: `descriptionSchema` and `batchSchema`.
- `src/inngest/describe-image.ts` -- `image-describe` function (1 retry, `keyworder/image.describe` trigger, 3-4 stepDurable steps).
- `src/inngest/index.ts` -- Barrel export: `functions` array + `inngest` client.

### Utilities
- `src/utils/db.ts` -- Kysely instance + TypeScript types for all 7 keyworder tables. Pool with SSL `rejectUnauthorized: false`. Query logging in DEV.
- `src/utils/utils.db.ts` -- `getBatchSuccessCount(batchId)` (filtered count of non-null results) + `getBatchTitles(batchId)` (list of titles).
- `src/utils/ai.ts` -- OpenAI client init with `OPENAI_API_KEY`.
- `src/utils/actions.ts` -- `checkIfSignedInAndGetUserId(headers)` session guard + `deductCredits(userId, amount, action, metadata?)` atomic balance check with `FOR UPDATE` row lock and audit trail.
- `src/utils/auth.ts` -- better-auth config: PostgreSQL dialect, keyworder schema model names, email/password + Google OAuth, cookie cache (5 min), trusted origins.
- `src/utils/auth-client.ts` -- Two clients: `authClient` (Svelte, `better-auth/svelte`) and `authClientVanilla` (vanilla, `better-auth/client`). Both with `inferAdditionalFields`.
- `src/utils/storage.ts` -- UploadThing `FileRouter` for `imageUploader`: 128MB, 100 files, session middleware, credit deduction in `onUploadComplete`. Also exports `UTApi` instance.
- `src/utils/storage-client.ts` -- `createUploader()` + `UploadButton` from `@uploadthing/svelte`, typed with `OurFileRouter`. `minifyImage()` function.
- `src/utils/audit.ts` -- Standalone `createCreditAudit()` (used by admin credit grant ops).

### Config & Constants
- `src/constants/credit-costs.ts` -- `CREDIT_COST_UPLOAD = 1`, `CREDIT_COST_DESCRIBE = 7`, `CREDIT_COST_REGENERATE = 5`.
- `src/constants/ai.ts` -- `AI_MODEL = "gpt-4.1-nano"`.
- `src/constants/hide-sidebar-links.ts` -- Includes `"/keyworder"` and `"/batch"`.
- `src/constants/link-presets.ts` -- Keyworder link with `requiresAuth: true`.
- `src/config.ts` -- Nav bar includes `LinkPreset.Keyworder`.
- `src/types/config.ts` -- `LinkPreset.Keyworder = 4`.
- `src/i18n/i18nKey.ts` -- `I18nKey.keyworder` + `I18nKey.batch`.

## Error handling & edge cases

- **Inngest failure in postFileIds**: All inserted rows + uploaded files cleaned up. User not charged.
- **Duplicate batch title**: `batch.complete` catches PG unique violation (`code: "23505"`) and silently skips.
- **AI parse failure**: `image.save` uses `safeParse`; sets `result: "fail"`, stores no title/description/keywords.
- **Ownership check**: `updateDescription` filters by both `id` + `user_id`. Returns `FORBIDDEN` if no match.
- **Insufficient credits**: `deductCredits` throws `ActionError` with `FORBIDDEN`. UI shows warning with removal suggestion.
- **Upload error**: `onUploadError` shows browser alert for `INTERNAL_CLIENT_ERROR`.
- **Polling timeout**: 5 attempts at 5s intervals (~25s). Shows error suggesting retry later.
- **Invalid batch ID**: UUID regex validation client-side before fetch.
- **Image load failure**: `ImageWithLoading` shows fallback icon on `onerror`.
- **Swup cache**: SSR queries don't re-run on client nav -- data fetching via `onMount` Astro actions.

## Environment variables

| Variable | Type | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | server secret | OpenAI API key |
| `DATABASE_URL` | server secret | PostgreSQL connection string |
| `UPLOADTHING_TOKEN` | server secret | UploadThing API token |
| `UPLOADTHING_APP_ID` | client public | UploadThing app ID (used in image URLs) |
| `INNGEST_API_URL` | server secret | Inngest endpoint (optional, defaults to Cloud) |
| `INNGEST_SIGNING_KEY` | server secret | Inngest signing key |
| `BETTER_AUTH_SECRET` | server secret | Auth session encryption secret |
| `GOOGLE_AUTH_CLIENT_ID` / `GOOGLE_AUTH_CLIENT_SECRET` | server secret | Google OAuth credentials |

## Styling conventions

- Cards: `card-base rounded-xl` with `px-5 py-5`.
- Buttons: `btn-regular`, `btn-ghost` with `active:scale-90` press effect.
- Colors: CSS variables `--primary`, `--border`, `--card-bg`, `--btn-plain-bg-hover`, `--input-bg`. Text uses `text-90`, `text-75`, `text-50`, `text-30` (opacity-based scale).
- UploadThing buttons styled via `appearance.button`/`appearance.container` with `twMerge` from `tailwind-merge`.
- Stats grid: `grid-cols-2 md:grid-cols-4 gap-4`.
- Image gallery: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`.

## Key extraction notes

1. All DB queries use `db.withSchema("keyworder")`.
2. Auth is tightly coupled to `keyworder` schema (better-auth model names).
3. Astro actions are the API layer (RPC-style, not REST).
4. Inngest event: `keyworder/image.describe` with `data: { fileId, descriptionId }`.
5. UploadThing file router in `src/utils/storage.ts` with middleware + `onUploadComplete`.
6. CSS variables and `tailwind-merge` for UploadThing styling need porting.
7. `daysAgo`/`getTime` from `@utils/date-utils` used by `BatchList.svelte`.
8. PhotoSwipe CSS imported directly: `import "photoswipe/style.css"`.
9. AI model: `gpt-4.1-nano` via `openai.responses.parse` (Responses API, not Chat Completions).
10. Image URLs: `https://${UPLOADTHING_APP_ID}.ufs.sh/f/${file_id}`.
