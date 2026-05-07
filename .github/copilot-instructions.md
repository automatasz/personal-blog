# Copilot Instructions for Personal Blog (Fuwari)

## Project Overview
A static Astro blog with integrated image gallery ("Keyworder") feature. The Keyworder subsystem uses AI (GPT-4.1-nano) to auto-generate keywords and descriptions for images, with background job processing via Inngest, PostgreSQL database, and Better-Auth for user authentication.

## Architecture & Data Flow

### Core Stack
- **Frontend**: Astro 5 (static site generation) + Svelte components + Tailwind CSS
- **Backend API**: Astro Actions (server-side functions) + API routes in `src/pages/api/`
- **Database**: PostgreSQL via Kysely ORM (types in [src/utils/db.ts](src/utils/db.ts))
- **Job Queue**: Inngest for async image processing
- **Auth**: Better-Auth with Google OAuth + email/password
- **AI/Pricing**: OpenAI API integration (with token tracking)
- **File Storage**: UploadThing for image uploads

### Key Service Boundaries
1. **Blog Content**: Markdown posts in `src/content/posts/` with Astro content collections
2. **Keyworder (Image AI Pipeline)**:
   - User uploads images → UploadThing stores them
   - `postFileIds` action queues Inngest event `keyworder/image.describe`
   - `describe-image` Inngest function (in [src/inngest/describe-image.ts](src/inngest/describe-image.ts)) calls OpenAI
   - Results stored in `keyworder.description` table + tokens tracked in `keyworder.batch`
   - Frontend polls via `checkEventComplete` action until batch completes
   - Results displayed in [src/components/ImageDescriptions.svelte](src/components/ImageDescriptions.svelte)
3. **Gallery**: Static masonry layout with image descriptions ([src/components/MasonryGallery.svelte](src/components/MasonryGallery.svelte))

## Developer Workflows

### Local Development
```bash
pnpm install && pnpm add sharp
pnpm dev                          # Start dev server (localhost:4321)
npx inngest-cli@latest dev -u http://localhost:4321/api/inngest  # Run Inngest dev server (separate terminal)
pnpm new-post <filename>          # Create new post template
pnpm type-check                   # Run TypeScript checks
pnpm build                        # Build + run pagefind indexing
```

**Database**: Requires PostgreSQL connection via `DATABASE_URL` env var. Migrations in `better-auth_migrations/`

### Key Environment Variables (from `astro:env/server` & `astro:env/client`)
- `DATABASE_URL`: PostgreSQL connection
- `GOOGLE_AUTH_CLIENT_ID`, `GOOGLE_AUTH_CLIENT_SECRET`: OAuth credentials
- `UPLOADTHING_APP_ID`: Image upload service
- `VERCEL_BRANCH_URL`: For OAuth redirects in preview deployments
- `OPENAI_API_KEY`: For AI image descriptions

## Project Conventions

### File Organization
- `src/pages/`: Route definitions (`.astro` for static, `.ts` for API endpoints)
- `src/actions/`: Astro server functions (called via `astro:actions` from client)
- `src/components/`: Reusable `.astro` + `.svelte` components
- `src/inngest/`: Async job definitions (exported in `functions` array)
- `src/utils/`: Shared utilities (db, auth, storage clients, helpers)

### Astro Actions Pattern
Server functions in `src/actions/` return `{ error?, data }` objects. Call from client/components via:
```typescript
import { actions } from "astro:actions";
const result = await actions.getBatch({ batchId });
```

### Database Schema (Kysely)
- All keyworder tables prefixed: `keyworder.*` (user, session, account, verification, description, batch)
- Types defined as interfaces in [src/utils/db.ts](src/utils/db.ts)
- Use Kysely query builder; migrations auto-managed by Better-Auth

### Svelte Components
- Use reactive state with `$state()` and derived values with `$derived()`
- Client-side interactivity: `client:load` directive in `.astro` files
- Icons via `@iconify/svelte` (FA6 + Material Symbols)

### Markdown Content
- Posts must have frontmatter: `title`, `published` (date), `description`, `tags`, `category`
- Custom directives: `:::admonition`, GitHub-style fenced code blocks
- Auto-generated: reading time (via [src/plugins/remark-reading-time.mjs](src/plugins/remark-reading-time.mjs)), KaTeX math rendering
- Excerpt extraction: first paragraph becomes preview

## Critical Integration Points

1. **Image Upload Flow**: UploadThing callback → `postFileIds` action → Inngest event → OpenAI → Database
2. **Polling Pattern** (see [src/components/ImageDescriptions.svelte](src/components/ImageDescriptions.svelte)):
   - Component stores batch UUID from URL query param
   - Polls `checkEventComplete` action every 3s until all images processed
   - Falls back to `getBatch` action if descriptions already ready
3. **Auth Middleware**: Better-Auth protects `/keyworder` route; uses session cookies
4. **Site Configuration**: [src/config.ts](src/config.ts) controls theme, navigation, metadata

## Build & Deployment
- Vercel integration via `@astrojs/vercel` (SSR-ready)
- Pagefind search indexing runs during build: `astro build && pagefind --site .vercel/output/static`
- Compression via astro-compress (CSS excluded for dev)
- Page transitions via Swup for SPA-like experience
