# Keyworder

A credit-gated tool for bulk-uploading images, generating AI-powered SEO metadata (titles, descriptions, keywords), and exporting the results for stock photography platforms. Available to all signed-in users with sufficient credits.

## What it does

1. **Image upload and pre-processing** — Images are selected through an upload dialog, resized to max 1024px and converted to WebP (quality 0.5) before upload to reduce storage and AI processing costs.
2. **AI description generation** — Each image is sent to OpenAI GPT-4.1 Nano, which returns a compelling title, a long description, and 100 SEO keywords optimized for stock photography sites.
3. **Batch title generation** — Once all images in a batch are described, a second AI call generates a single compelling title that suits the collection.
4. **Review and editing** — Results are displayed in a gallery with PhotoSwipe lightbox. Titles, descriptions, and keywords can be edited in-place. Individual descriptions can be regenerated.
5. **Export** — Keywords can be copied per image, and the entire batch can be downloaded as an Adobe Stock CSV (Filename, Title, Keywords, Category, Releases).
6. **Batch history** — All past batches are listed with their titles, image counts, and dates.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (Svelte)                       │
│  Keyworder.svelte ── ImageUploader.svelte ── BatchList.svelte│
│                                      ImageDescriptions.svelte│
└──────────────┬───────────────────────────────────────────────┘
               │ Astro Actions (RPC-like server calls)
┌──────────────▼───────────────────────────────────────────────┐
│                 BACKEND (Astro Actions)                      │
│  postFileIds, getBatch, getBatches, checkEventComplete,      │
│  updateDescription, regenerateDescription, getStats          │
└──────┬──────────────────────┬────────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐    ┌─────────────────────┐
│   Database   │    │   Inngest (queue)   │
│  PostgreSQL  │◄───│  image-describe fn  │
│  (keyworder  │    │  batch title gen    │
│   schema)    │    └─────────┬───────────┘
└──────────────┘              │
                              ▼
                    ┌─────────────────┐
                    │  OpenAI GPT-4.1 │
                    │  Nano           │
                    └─────────────────┘
```

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Astro (SSR pages + server actions) |
| Frontend | Svelte 5 (runes mode) |
| Database | PostgreSQL via Kysely (typed query builder) |
| Schema | Dedicated `keyworder` PostgreSQL schema |
| Auth | better-auth (Google OAuth, credit-based access) |
| File storage | UploadThing (S3-compatible CDN) |
| Background jobs | Inngest (event-driven, durable execution) |
| AI | OpenAI GPT-4.1 Nano with structured output (Zod) |
| Lightbox | PhotoSwipe |
| Icons | Iconify (Lucide set) |

## Database schema

### `keyworder.description`
Stores each image and its generated metadata.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `file_id` | text | UploadThing file key |
| `file_name` | text | Original filename |
| `keywords` | text[] | Array of ~100 SEO keywords |
| `description` | text | AI-generated long description |
| `title` | text | AI-generated title |
| `user_id` | text FK | Links to `keyworder.user` |
| `batch_id` | text | UUID shared by all images in a batch |
| `tokens_used` | int | OpenAI tokens consumed |
| `result` | text | `"success"` or `"fail"` |
| `width` | int | Image width in pixels |
| `height` | int | Image height in pixels |
| `created_at` | timestamp | Row creation time |

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
| `credits` | int | Remaining credit balance (default 0) |
| `createdAt` | timestamp | Account creation time |
| `updatedAt` | timestamp | Last update time |

### `keyworder.session`, `keyworder.account`, `keyworder.verification`
Auth tables managed by better-auth.

## End-to-end flow

### Step 1: Upload
1. User visits `/keyworder`, rendered by `Keyworder.svelte`.
2. `ImageUploader.svelte` uses UploadThing's `UploadButton`. On file selection, `onBeforeUploadBegin` runs `minifyImage()` on each file — resizes to max 1024px, converts to WebP at 50% quality.
3. UploadThing's `imageUploader` route (`src/utils/storage.ts`) validates the session via middleware, then stores the files. Each uploaded file deducts 1 credit from the user's balance in `onUploadComplete`.
4. After upload, selected images appear in a gallery. User can remove individual images or clear all (no credit refund).

### Step 2: Submit for description
5. User clicks "Describe". `ImageUploader.svelte` calls `actions.postFileIds()` with each file's UploadThing key, original filename, width, and height.
6. **`postFileIds` action** (`src/actions/postFileIds.ts`):
   - Validates the user is signed in via `checkIfSignedInAndGetUserId()`.
   - Deducts `files.length` credits from the user's balance (1 credit per image for describing).
   - Generates a shared `batchId` UUID.
   - Inserts one row per file into `keyworder.description` with `batch_id` set.
   - Fires one `keyworder/image.describe` Inngest event per image (each event carries `fileId` and `descriptionId`).
   - Returns the `batchId`.
7. Browser navigates to `/batch?id=<batchId>`.

### Step 3: Background AI processing
8. **`image-describe` Inngest function** (`src/inngest/describe-image.ts`) runs for each event:
   - **Step "openai.wrap.image.describe"**: Calls OpenAI GPT-4.1 Nano with the image URL (`https://<appId>.ufs.sh/f/<fileId>`) and a prompt: *"You are a photography and SEO expert. You must generate 100 short, relevant keywords..."*. Uses `zodTextFormat` with `descriptionSchema` for structured output (JSON with `title`, `description`, `keywords[]`).
   - **Step "image.save"**: Persists the AI response to `keyworder.description`. Sets `result` to `"success"` or `"fail"`. Checks if all descriptions in the batch have a result via `getBatchSuccessCount()`. If the batch is fully done, fetches all titles for batch-title generation.
   - **Step "openai.wrap.batch.title"** (conditional): If all images succeeded, calls OpenAI again with the prompt: *"You are a newspaper writer... create a compelling title that suits the collection"*. Uses `zodTextFormat` with `batchSchema`.
   - **Step "batch.complete"** (conditional): Inserts the batch title into `keyworder.batch`. Handles unique constraint violations gracefully (duplicate batch titles are silently skipped).

### Step 4: Results display
9. `ImageDescriptions.svelte` mounts on `/batch` and calls `actions.getBatch()`. If descriptions aren't ready (no `result` field), it polls `actions.checkEventComplete()` up to 5 times at 5-second intervals.
10. Once ready, each image shows: thumbnail (with PhotoSwipe lightbox on click), title, filename, long description, and keywords (first 10 shown, "Show more" toggle for the rest).

### Step 5: Editing and export
11. **In-place editing**: Clicking the edit icon switches the row to edit mode with input fields for title, description, and comma-separated keywords. Saving calls `actions.updateDescription()`, which validates the session and updates the row (no credit cost).
12. **Regeneration**: Clicking the refresh icon calls `actions.regenerateDescription()`, which deducts 1 credit, then calls OpenAI directly (synchronously, bypassing Inngest) and updates the DB.
13. **Copy keywords**: Per-image button copies all keywords as a comma-separated string.
14. **Adobe Stock CSV**: Downloads the full batch as a CSV with columns: Filename, Title, Keywords, Category (always "3"), Releases (empty). Properly escapes commas and quotes in cells.

## File inventory

### Pages
- `src/pages/keyworder.astro` — Main page at `/keyworder`
- `src/pages/batch.astro` — Batch results at `/batch?id=<uuid>`
- `src/pages/sign-in.astro` — Auth page, redirects to `/keyworder` on success
- `src/pages/api/inngest.ts` — Inngest webhook handler
- `src/pages/api/uploadthing.ts` — UploadThing webhook handler

### Components (Svelte)
- `src/components/Keyworder.svelte` — Root: session gate, renders uploader + batch list
- `src/components/ImageUploader.svelte` — Upload UI with image minification
- `src/components/BatchList.svelte` — Lists completed batches
- `src/components/ImageDescriptions.svelte` — Gallery with editing, export, lightbox
- `src/components/ImageWithLoading.svelte` — Image loader with spinner and error fallback
- `src/components/UserSessionCard.svelte` — Sign-in / sign-out

### Actions (Astro server endpoints)
- `src/actions/postFileIds.ts` — Insert description rows, dispatch Inngest events
- `src/actions/getBatch.ts` — Fetch all descriptions + batch title
- `src/actions/getBatches.ts` — List completed batches for history
- `src/actions/checkEventComplete.ts` — Poll: are all descriptions in a batch done?
- `src/actions/getStats.ts` — Aggregate stats (batch count, image count, token sum)
- `src/actions/updateDescription.ts` — Edit + regenerate a single description

### Inngest (background jobs)
- `src/inngest/client.ts` — Inngest client setup
- `src/inngest/types.ts` — Event type and Zod schemas (`descriptionSchema`, `batchSchema`)
- `src/inngest/describe-image.ts` — The `image-describe` function (3 steps)
- `src/inngest/index.ts` — Barrel export

### Utilities
- `src/utils/db.ts` — Kysely DB instance + TypeScript table type definitions
- `src/utils/utils.db.ts` — `getBatchSuccessCount()`, `getBatchTitles()` query helpers
- `src/utils/ai.ts` — OpenAI client initialization
- `src/utils/actions.ts` — `checkIfSignedInAndGetUserId()` session guard, `deductUserCredits()` atomic balance check
- `src/utils/auth.ts` — better-auth configuration (uses `keyworder` schema tables)
- `src/utils/storage.ts` — UploadThing FileRouter with admin auth middleware
- `src/utils/storage-client.ts` — Client-side upload helpers + `minifyImage()`
- `src/utils/auth-client.ts` — Client-side better-auth instance

### Config
- `src/constants/credit-costs.ts` — Credit costs for all keyworder actions
- `better-auth_migrations/2025-06-14T16-15-38.649Z.sql` — DDL for all 6 `keyworder` tables

## Cost model

Credit costs are defined in `src/constants/credit-costs.ts` as the single source of truth.

| Action | Credit cost |
|---|---|
| Upload an image | 1 credit |
| Describe an image (batch) | 7 credits per image |
| Regenerate a single description | 5 credits |
| Edit title/description/keywords | 0 credits |
| View batch / history | 0 credits |

Credits are deducted atomically at each step. If a user runs out, the upload or describe action is rejected. No refunds are given for removed images or failed AI descriptions.

## Authorization

All keyworder actions require a valid session. Users must have sufficient credits to upload and describe images. The guard `checkIfSignedInAndGetUserId()` in `src/utils/actions.ts` verifies the session. Write operations (`postFileIds`, `regenerateDescription`, upload middleware) additionally call `deductUserCredits()` which atomically checks and decrements the user's credit balance.

The UploadThing file route validates the session via middleware and deducts 1 credit per uploaded file in `onUploadComplete`.

## AI prompts

**Per-image prompt** (generates title, description, 100 keywords):
> You are a photography and SEO expert. You must generate 100 short, relevant keywords for an uploaded image. Use 100 popular and descriptive keywords that help rank the image higher in stock websites. In addition, create a compelling title and a long description that suit the image well.

**Batch title prompt** (generates a collection title from all individual titles):
> You are a newspaper writer who is an expert at their job. You are given a collection of image titles. Your task is to create a compelling title that suits the collection of these images well.
>
> (followed by the list of individual titles, one per line)

## Environment variables

Required environment variables:
- `OPENAI_API_KEY` — OpenAI API key
- `DATABASE_URL` — PostgreSQL connection string
- `UPLOADTHING_TOKEN` — UploadThing secret token
- `UPLOADTHING_APP_ID` — UploadThing app ID
- `INNGEST_API_URL` — Inngest API endpoint (optional, defaults to Inngest Cloud)
- `INNGEST_SIGNING_KEY` — Inngest signing key
- `BETTER_AUTH_SECRET` — Auth session encryption secret
- `GOOGLE_AUTH_CLIENT_ID` / `GOOGLE_AUTH_CLIENT_SECRET` — Google OAuth credentials
