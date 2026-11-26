# MAMA INTERIOR — Admin CMS & Backend API

A full-stack, single-owner Content Management System and Backend API for **MAMA INTERIOR** (`https://admin.mamainterior.in` in intended production), built with **Next.js 16 (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Zod**, and **Cloudinary**.

This application serves two responsibilities in a single deployable service:
1. **Private Admin Dashboard (`app/(protected)/*`):** Enables the business owner to manage portfolio projects, before/after media pairs, trade services, homepage curation, site settings, and audit logs.
2. **Versioned REST API (`app/api/v1/*`):** Exposes authenticated admin endpoints (`/api/v1/admin/*`), session auth endpoints (`/api/v1/auth/*`), and CORS-enabled public read endpoints (`/api/v1/public/*`) consumed by the Public Website.

---

## System Architecture & Repository Relationship

The MAMA INTERIOR platform separates customer-facing delivery from privileged database and media operations:

| Application | Intended Production URL | Repository / Directory | Responsibility |
| :--- | :--- | :--- | :--- |
| **Public Website** | `https://mamainterior.in` | [`../website/README.md`](../website/README.md) | Customer-facing portfolio, service pages, lead capture, zero DB/Cloudinary secrets |
| **Admin CMS & Backend API** *(this repo)* | `https://admin.mamainterior.in` | `admin/` | Owner authentication, PostgreSQL persistence via Prisma, signed Cloudinary uploads, and `/api/v1/*` API |

> **Deployment Status Note:** `https://mamainterior.in` and `https://admin.mamainterior.in` are the intended architecture domains configured in `.env.example`, `lib/env.ts`, and `docs/DEPLOYMENT_AND_OPERATIONS_MANUAL.md`. Live production deployment is not verified from this repository alone.

```mermaid
flowchart TB
    Owner["Owner Browser"] -->|HTTPS + HttpOnly Cookie| AdminUI["Admin CMS UI (/app/(protected)/*)"]
    AdminUI -->|"Authenticated Mutations"| AdminAPI["/api/v1/admin/* & /api/v1/auth/*"]
    Owner -->|"Direct Signed Upload (XHR)"| Cloudinary["Cloudinary CDN"]
    AdminAPI -->|"Prisma ORM"| Postgres[("PostgreSQL")]
    AdminAPI -->|"Sign / Verify / Destroy"| Cloudinary
    PublicSite["Public Website (website/)"] -->|"GET /api/v1/public/* (CORS)"| PublicAPI["/api/v1/public/*"]
    PublicAPI -->|"Read Published Only"| Postgres
```

---

## Admin Features

### Implemented Features
- **Single-Owner Authentication (`/login`, `/api/v1/auth/*`):** Email/password login with `bcryptjs` (12 salt rounds), opaque database-backed sessions, and no public signup route.
- **Dashboard Overview (`app/(protected)/page.tsx`):** Displays live counts (total projects, published, drafts, media assets), recent projects, and recent activity logs.
- **Project & Portfolio Management (`/projects`, `/projects/new`, `/projects/[id]/edit`):** Full CRUD, slug generation, trade category assignment, scope highlights, `ProjectMedia` role assignment (`COVER`, `GALLERY`, `PROCESS`, `BEFORE`, `AFTER`), preview modal (`ProjectPreviewModal`), and publishing lifecycle (`DRAFT` -> `PUBLISHED` -> `ARCHIVED`).
- **Publishing Guardrails (`POST /api/v1/admin/projects/[id]/publish`):** Server-side `validateForPublishing()` enforces title, slug, category, short description, and a `COVER` media asset before allowing `PUBLISHED` status.
- **Cloudinary Media Library (`/media`):** Drag-and-drop multi-file uploader (`MediaUploader` with max 3 concurrent uploads, 15 MB image / 100 MB video limits), media picker modal (`MediaPickerModal`), metadata editing (`altText`, `caption`), and deletion protection for assets linked to projects.
- **Services & Categories Management (`/services`):** Create/update/delete services and categories plus drag/order persistence (`/api/v1/admin/services/reorder`).
- **Homepage Curation (`/homepage`):** Curate and order featured published projects via `HomepageFeaturedProject`.
- **Site Settings (`/settings`):** Key-value JSON settings store (`SiteSetting`) for business contact info and homepage copy.
- **Activity & Audit Trail (`/activity`):** Chronological `ActivityLog` table tracking logins, failed logins, logouts, project lifecycle events, media uploads/deletions, service updates, and settings changes.
- **Operations Scripts (`scripts/`):** Owner bootstrap (`bootstrap-owner.ts`), Cloudinary connectivity check (`test-cloudinary.ts`), and PowerShell database backup/restore scripts (`backup-db.ps1`, `restore-db.ps1`).

### Partial / Planned Features
- **Automatic Cache Revalidation Webhook:** `REVALIDATION_WEBHOOK_URL` and `REVALIDATION_SECRET` are validated in `lib/env.ts` and documented in `.env.example`, and the Public Website exposes `POST /api/revalidate`, **but `admin` does not yet automatically dispatch the webhook** on project publish/unpublish/archive or settings updates.
- **Distributed Rate Limiting:** `lib/auth/rate-limit.ts` uses an in-memory `Map` (5 failed attempts per 15 minutes per `ip:email`). In a multi-instance or serverless deployment, this would need a shared store such as Redis.

---

## Technology Stack

| Category | Technology | Version (from `package.json`) | Role in Project |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router + Turbopack) | `16.4.6` | Full-stack React Server Components + Route Handlers (`/api/v1/*`) |
| **UI Runtime** | React / React DOM | `19.3.0` | Server & Client Component rendering |
| **Language** | TypeScript (`strict: true`) | `^5` | Strict type safety across UI, services, repositories, and Zod schemas |
| **Styling** | Tailwind CSS + `@tailwindcss/turbopack` | `4.3.3` | Utility styling and CSS custom properties in `app/globals.css` |
| **Database & ORM** | PostgreSQL + Prisma (`@prisma/client`, `prisma`) | `^6.19.3` | Relational data modeling, migrations, and typed queries |
| **Validation** | Zod | `^4.6.7` | Environment validation (`lib/env.ts`) and API payload schemas (`lib/validation/*`) |
| **Authentication** | `bcryptjs` + Node `crypto` | `^3.0.3` | Password hashing (12 rounds), 32-byte opaque tokens, SHA-256 token & IP hashing |
| **Media Storage** | `cloudinary` | `^2.11.0` | Server-side upload signing, asset verification (`api.resource`), and CDN deletion |
| **Icons** | `lucide-react` | `^1.72.0` | Admin navigation, status badges, and action controls |
| **Server Boundary** | `server-only` | `^0.0.1` | Compile-time guard preventing server modules from leaking into client bundles |
| **Tooling / Tests** | `tsx` + ESLint | `^4.23.15` / `^9` | Running TypeScript integration test suites and CLI scripts |

---

## Architecture & Project Structure

### Layered Backend Pattern
The backend follows a clean separation of concerns:
1. **Route Handlers (`app/api/v1/*`):** Parse HTTP requests, enforce `requireAdmin()` and `verifyMutationOrigin()`, validate payloads with Zod (`lib/validation/*`), and return standardized JSON envelopes via `lib/http/response.ts` (`apiSuccess`, `apiError`, `apiUnauthorized`, `apiForbidden`, `apiNotFound`, `apiTooManyRequests`).
2. **Services (`server/services/*`):** Contain business logic, Cloudinary verification, rate-limit enforcement, BigInt serialization, and audit logging (`server/audit/audit.service.ts`).
3. **Repositories (`server/repositories/*`):** Encapsulate Prisma queries against PostgreSQL.

### Directory Tree

```text
admin/
├── app/
│   ├── (protected)/                  # Server-guarded admin routes (force-dynamic)
│   │   ├── layout.tsx                # Calls requireAdmin(); redirects to /login if unauthenticated
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── activity/page.tsx         # Audit log table
│   │   ├── homepage/page.tsx         # Curated homepage featured projects
│   │   ├── media/page.tsx            # Cloudinary media library
│   │   ├── projects/                 # Project list, /new, and /[id]/edit
│   │   ├── services/page.tsx         # Services & categories management
│   │   └── settings/page.tsx         # Site settings editor
│   ├── api/v1/
│   │   ├── admin/                    # Protected admin CRUD & workflow endpoints
│   │   ├── auth/                     # login, logout, session endpoints
│   │   └── public/                   # CORS-enabled public read endpoints
│   ├── login/page.tsx                # Admin sign-in page
│   ├── globals.css                   # Tailwind v4 & CSS variables
│   └── layout.tsx                    # Root layout (robots: noindex, nofollow)
├── components/
│   ├── layout/                       # AdminHeader, AdminShell, AdminSidebar
│   ├── media/                        # MediaUploader, MediaPickerModal, MediaDetailsModal
│   ├── projects/                     # ProjectForm, ProjectPreviewModal
│   └── ui/                           # ConfirmDialog, EmptyState, LoadingSkeleton, PageHeader, StatCard, StatusBadge
├── docs/
│   └── DEPLOYMENT_AND_OPERATIONS_MANUAL.md
├── lib/
│   ├── auth/                         # crypto.ts, guard.ts, rate-limit.ts, session.ts
│   ├── cloudinary/client.ts          # Signed upload params, asset verification, CDN destroy
│   ├── db/prisma.ts                  # PrismaClient singleton + BigInt serializer
│   ├── http/response.ts              # Standardized API response & CORS helpers
│   ├── validation/                   # Zod schemas (auth, homepage, media, project, service, settings)
│   └── env.ts                        # Startup Zod validation for environment variables
├── prisma/
│   ├── migrations/                   # SQL migrations (20261111140000_init)
│   ├── schema.prisma                 # PostgreSQL schema (10 models, 6 enums)
│   └── seed.ts                       # Seeds core trade categories
├── scripts/                          # bootstrap-owner.ts, test-cloudinary.ts, backup-db.ps1, restore-db.ps1
├── server/
│   ├── audit/audit.service.ts        # ActivityLog writer
│   ├── repositories/                 # Prisma data-access layer
│   └── services/                     # Business logic layer
└── tests/                            # auth, media, project-publishing, services-settings, e2e-integration
```

---

## Authentication & Security

### Implemented Controls
- **Frontend Route Guard vs. Backend Authorization:**
  - *Frontend / SSR Route Guard:* `app/(protected)/layout.tsx` (`export const dynamic = "force-dynamic"`) runs `requireAdmin()` on the server and redirects unauthenticated visitors to `/login`.
  - *Backend API Authorization:* Every `/api/v1/admin/*` Route Handler independently calls `requireAdmin(request)` and returns `401 Unauthorized` if the session is missing, expired, or inactive. Relying on UI redirects alone is never sufficient because API routes can be called directly.
- **Session Management (`lib/auth/session.ts`):**
  - Generates a 32-byte (`64` hex char) cryptographically random opaque token (`crypto.randomBytes(32)`).
  - Stores only the **SHA-256 hash** (`tokenHash`) in `admin_sessions` — raw tokens are never persisted in the database.
  - Sets cookie `mama_admin_session` with `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`, `path: "/"`, and `maxAge: 7 days`.
  - Debounces `lastSeenAt` updates (every 5 minutes) and deletes expired sessions on validation.
- **CSRF / Origin Protection (`verifyMutationOrigin`):** State-changing admin and auth routes validate `Origin` / `Referer` headers against `Host` and an explicit allowlist (`localhost:3000`, `localhost:3001`, `127.0.0.1:3000`, `127.0.0.1:3001`, `admin.mamainterior.in`).
- **Brute-Force Protection:** `lib/auth/rate-limit.ts` limits failed login attempts to 5 per 15-minute window per `ip:email`, returning `429 Too Many Requests` with `Retry-After`.
- **Privacy & Indexing:** Client IP addresses are SHA-256 hashed (truncated to 16 chars) before storage in `admin_sessions.ipAddressHash`, and `app/layout.tsx` sets `robots: "noindex, nofollow"`.

```mermaid
sequenceDiagram
    participant Browser as Owner Browser
    participant LoginAPI as POST /api/v1/auth/login
    participant AuthSvc as server/services/auth.service.ts
    participant DB as PostgreSQL (admin_users, admin_sessions)

    Browser->>LoginAPI: Email + Password
    LoginAPI->>LoginAPI: verifyMutationOrigin() + Zod loginSchema
    LoginAPI->>AuthSvc: authenticateOwner()
    AuthSvc->>AuthSvc: Check in-memory rate limit (5 / 15m)
    AuthSvc->>DB: Lookup AdminUser & verify bcrypt (12 rounds)
    AuthSvc->>DB: Create AdminSession (SHA-256 tokenHash, 7d expiry)
    AuthSvc->>DB: Write LOGIN_SUCCESS to ActivityLog
    LoginAPI-->>Browser: 200 OK + Set-Cookie: mama_admin_session (HttpOnly, SameSite=Lax)
```

---

## Database & Data Management

All database access occurs exclusively on the server via **Prisma ORM** (`prisma/schema.prisma`) connected to **PostgreSQL**:

- **Users & Auth:** `AdminUser` (`OWNER` role) -> `AdminSession` (1:N, cascade delete), `ActivityLog` (1:N, set null).
- **Portfolio & Services:**
  - `ServiceCategory` (1:N) -> `Service` and `Project` (`onDelete: Restrict`).
  - `Project` (`DRAFT` | `PUBLISHED` | `ARCHIVED`) -> `ProjectHighlight` (1:N, cascade), `ProjectMedia` (1:N, cascade), `HomepageFeaturedProject` (1:1, cascade).
  - `MediaAsset` (`IMAGE` | `VIDEO`) -> `ProjectMedia` (1:N, `onDelete: Restrict`, unique `[projectId, mediaAssetId]`).
- **Configuration:** `SiteSetting` (key-value `Json` store).

---

## Cloudinary & Media Management

Sensitive credentials (`CLOUDINARY_API_SECRET`, `CLOUDINARY_API_KEY`) remain strictly on the server. The browser never receives `CLOUDINARY_API_SECRET`.

```mermaid
sequenceDiagram
    participant UI as MediaUploader (Browser)
    participant SigAPI as POST /api/v1/admin/media/signature
    participant CDN as Cloudinary Upload API
    participant ConfirmAPI as POST /api/v1/admin/media/confirm
    participant DB as PostgreSQL (media_assets)

    UI->>UI: Validate type & size (<=15MB img, <=100MB vid)
    UI->>SigAPI: Request signed params (resourceType, folderSuffix)
    SigAPI->>SigAPI: requireAdmin() + sanitize folder ("mama-interior/...")
    SigAPI-->>UI: { cloudName, apiKey, timestamp, signature, folder, uploadUrl }
    UI->>CDN: Direct XHR upload with signature
    CDN-->>UI: { public_id, ... }
    UI->>ConfirmAPI: Confirm upload (publicId, resourceType)
    ConfirmAPI->>CDN: cloudinary.api.resource(publicId) [authoritative verify]
    ConfirmAPI->>DB: Upsert MediaAsset + log MEDIA_UPLOADED
    ConfirmAPI-->>UI: 201 Created (MediaAsset)
```

- **Server-Side Verification:** `verifyCloudinaryAsset()` queries Cloudinary directly for authoritative `bytes`, `width`, `height`, `durationSeconds`, `format`, and `secureUrl` before persisting to PostgreSQL.
- **Deletion Rules (`deleteMediaAsset`):** Deletion is **blocked with `CONFLICT`** if `countProjectsUsingMedia(id) > 0`. Unlinked assets are removed from Cloudinary (`cloudinary.uploader.destroy(..., { invalidate: true })`), deleted from PostgreSQL, and logged as `MEDIA_DELETED`.

---

## Content Publishing Workflow

```mermaid
stateDiagram-v2
    [*] --> DRAFT: POST /api/v1/admin/projects
    DRAFT --> PUBLISHED: POST .../publish (validateForPublishing passes)
    PUBLISHED --> DRAFT: POST .../unpublish
    DRAFT --> ARCHIVED: POST .../archive
    PUBLISHED --> ARCHIVED: POST .../archive
```

- `GET /api/v1/public/projects` and `GET /api/v1/public/projects/[slug]` strictly filter for `status: "PUBLISHED"` so `DRAFT` and `ARCHIVED` projects are never exposed to the public website.

---

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public (Origin-checked + Rate-limited) | Authenticate owner and set `mama_admin_session` cookie |
| `POST` | `/api/v1/auth/logout` | Session | Revoke active session in DB and clear cookie |
| `GET` | `/api/v1/auth/session` | Session | Return current authenticated admin user context |

### Admin Endpoints (`/api/v1/admin`) — *All require valid `mama_admin_session`*

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET`, `POST` | `/api/v1/admin/projects` | List all projects (including drafts/archived) or create a new project |
| `GET`, `PATCH` | `/api/v1/admin/projects/[id]` | Fetch single project details or update project fields/media/highlights |
| `POST` | `/api/v1/admin/projects/[id]/publish` | Validate publishing criteria and transition to `PUBLISHED` |
| `POST` | `/api/v1/admin/projects/[id]/unpublish` | Revert project to `DRAFT` |
| `POST` | `/api/v1/admin/projects/[id]/archive` | Archive project |
| `PATCH` | `/api/v1/admin/projects/[id]/featured` | Toggle featured status |
| `GET` | `/api/v1/admin/media` | Paginated/searchable media library listing |
| `POST` | `/api/v1/admin/media/signature` | Generate server-signed Cloudinary upload parameters |
| `POST` | `/api/v1/admin/media/confirm` | Authoritatively verify uploaded asset with Cloudinary and save to DB |
| `GET`, `PATCH`, `DELETE` | `/api/v1/admin/media/[id]` | Inspect, update `altText`/`caption`, or delete unlinked media asset |
| `GET`, `POST` | `/api/v1/admin/services` | List or create services |
| `PATCH`, `DELETE` | `/api/v1/admin/services/[id]` | Update or delete a service |
| `PATCH` | `/api/v1/admin/services/reorder` | Persist service sort order |
| `PATCH`, `DELETE` | `/api/v1/admin/services/categories/[id]` | Update or delete a service category |
| `GET`, `PATCH` | `/api/v1/admin/homepage` *(GET, PUT)* | Read or update curated homepage featured projects |
| `GET`, `PATCH` | `/api/v1/admin/settings` | Read or update site settings |

### Public Endpoints (`/api/v1/public`) — *CORS-enabled (`GET`, `OPTIONS`)*

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/v1/public/homepage` | Curated featured published projects + public-safe settings |
| `GET` | `/api/v1/public/projects` | Published projects (supports `category`, `featured`, `limit` query params) |
| `GET` | `/api/v1/public/projects/[slug]` | Single published project by slug (`404` if draft/archived) |
| `GET` | `/api/v1/public/services` | Active public services |
| `GET` | `/api/v1/public/services/[slug]` | Single active service by slug |
| `GET` | `/api/v1/public/settings` | Public-safe site settings |

---

## Environment Configuration & Local Setup

### Environment Variables (`lib/env.ts` & `.env.example`)

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string for Prisma |
| `SESSION_SECRET` | **Yes** | Minimum 32-character secret validated at startup |
| `CLOUDINARY_CLOUD_NAME` | For media | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For media | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For media | Server-only Cloudinary secret used to sign uploads & verify/delete assets |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Optional | Public cloud name reference |
| `ALLOWED_PUBLIC_ORIGINS` | Optional | Comma-separated CORS origins (defaults to `https://mamainterior.in,http://localhost:3000`) |
| `REVALIDATION_WEBHOOK_URL` | Optional | Public website `/api/revalidate` URL (validated in `env.ts`; webhook dispatch not yet wired) |
| `REVALIDATION_SECRET` | Optional | Shared secret (min 16 chars) for cache revalidation |
| `ADMIN_BOOTSTRAP_EMAIL` | For CLI | Initial owner email for `npm run bootstrap:owner` |
| `ADMIN_BOOTSTRAP_PASSWORD` | For CLI | Initial owner password (min 8 chars) for `npm run bootstrap:owner` |
| `NODE_ENV` | Auto | `development`, `test`, or `production` |

> **Safe `.env` Template:**
> ```env
> DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mama_interior?schema=public"
> SESSION_SECRET="replace-with-at-least-32-random-characters"
> ADMIN_BOOTSTRAP_EMAIL="owner@mamainterior.in"
> ADMIN_BOOTSTRAP_PASSWORD="replace-with-strong-password"
>
> CLOUDINARY_CLOUD_NAME=""
> CLOUDINARY_API_KEY=""
> CLOUDINARY_API_SECRET=""
> NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
>
> ALLOWED_PUBLIC_ORIGINS="https://mamainterior.in,http://localhost:3000"
> REVALIDATION_WEBHOOK_URL="https://mamainterior.in/api/revalidate"
> REVALIDATION_SECRET="replace-with-shared-revalidation-secret"
> ```

### Local Development & Verification Commands

```bash
# 1. Install dependencies
cd admin
npm install

# 2. Configure environment
cp .env.example .env   # Fill in PostgreSQL, SESSION_SECRET, and Cloudinary values

# 3. Apply database migrations & seed core trade categories
npx prisma migrate deploy
npx prisma db seed

# 4. Bootstrap the single-owner admin account
npm run bootstrap:owner

# 5. Start development server (recommended on port 3001 alongside website on 3000)
npx next dev -p 3001   # or `npm run dev` (defaults to port 3000)

# 6. Lint, build, and start production server
npm run lint
npm run build
npm run start
```

### Available Test & Utility Scripts (`package.json`)

- `npm run test:auth` — Authentication and session tests (`tests/auth.test.ts`)
- `npm run test:media` — Media signature, verification, and deletion guard tests (`tests/media.test.ts`)
- `npm run test:publishing` — Project publishing validation tests (`tests/project-publishing.test.ts`)
- `npm run test:services-settings` — Services and settings tests (`tests/services-settings.test.ts`)
- `npm run test:e2e` — End-to-end integration tests (`tests/e2e-integration.test.ts`)
- `npm run test:all` — Runs all 5 test suites sequentially
- `npm run test:cloudinary` — Verifies Cloudinary credentials (`scripts/test-cloudinary.ts`)

---

## Engineering Decisions & Trade-offs

- **Unified Admin UI + Backend API:** Co-locating the Admin CMS UI and `/api/v1/*` Route Handlers in one Next.js app eliminates an extra backend deployment and allows Server Components to query Prisma directly while exposing clean REST endpoints to the decoupled Public Website. *Trade-off:* Scaling the public API independently from the admin UI later would require extracting `/api/v1/public/*`.
- **Direct Browser-to-Cloudinary Signed Uploads + Server Verification:** Large site videos (up to 100 MB) bypass the Next.js server during upload to avoid payload limits and bandwidth bottlenecks, while `POST /api/v1/admin/media/confirm` authoritatively queries Cloudinary before writing to PostgreSQL.
- **Referential Integrity on Media Deletion:** `ProjectMedia` uses `onDelete: Restrict` and `MediaService.deleteMediaAsset()` blocks deletion if an asset is linked to any project, preventing broken images on published pages.
- **Database-Backed Opaque Sessions over Stateless JWTs:** Storing SHA-256 hashes of opaque tokens in `admin_sessions` enables immediate server-side session revocation on logout or account deactivation.

---

## Technical Highlights

- **Defense-in-Depth Auth:** Server-side `ProtectedLayout` guard + per-route `requireAdmin()` + `verifyMutationOrigin()` CSRF checks + bcrypt (12 rounds) + hashed opaque session tokens.
- **Authoritative Media Pipeline:** Signed upload generation, client-side concurrency queue (max 3), server-side Cloudinary metadata verification, and audit logging.
- **Startup Environment Validation:** Fail-fast Zod schema in `lib/env.ts` prevents misconfigured deployments without logging secret values.

## Key Engineering Learnings

- Designing a decoupled two-app architecture where public traffic never touches database credentials or media secrets.
- Implementing secure direct-to-CDN uploads without trusting client-submitted file metadata.
- Enforcing server-side publishing state machines (`DRAFT` -> `PUBLISHED` -> `ARCHIVED`) and relational integrity in PostgreSQL/Prisma.
- Structuring Next.js App Router backends with clean Route Handler -> Service -> Repository layering.

---

## Future Improvements

- Wire `REVALIDATION_WEBHOOK_URL` dispatch into project publish/unpublish/archive, homepage curation, and settings mutation handlers so the Public Website cache refreshes immediately.
- Replace the in-memory login rate limiter (`lib/auth/rate-limit.ts`) with a persistent/distributed store (e.g., Redis) for multi-instance deployments.
- Add automated CI checks running `npm run lint`, `npx tsc --noEmit`, `npm run test:all`, and `npm run build` against a test PostgreSQL instance.
