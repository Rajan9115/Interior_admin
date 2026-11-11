# MAMA INTERIOR CMS

## Production Architecture & Phased Antigravity Implementation Plan

**Confirmed decisions** - Existing Next.js + TypeScript application -
Next.js App Router Route Handlers for backend APIs - PostgreSQL +
Prisma - Cloudinary for image and video storage - One owner/admin
account initially

## 1. Executive summary

Convert MAMA INTERIOR into a CMS-driven website. The owner can sign in
to `/admin`, create projects, upload photos/videos, manage service
content, select homepage featured projects, preview drafts and publish.
The existing public website keeps its current design and reads published
content from the database.

Do not build a separate backend service initially. Keep backend logic
modular so it can be extracted later if scale or operational needs
justify it.

Core rules: 1. Preserve existing public UI and interactions. 2. Store
media files in Cloudinary; store metadata and relationships in
PostgreSQL. 3. Only published projects and active services are public.
4. Every admin mutation must be authorized server-side. 5. Never expose
database credentials, Cloudinary API secret, password hashes or session
tokens. 6. Use preview-before-publish, validation, audit logs and safe
archival. 7. Implement one phase at a time and obtain approval between
phases.

## 2. System architecture

``` text
Public visitors
   |
   v
Existing Next.js public website
   |
   +---- Public read APIs (/api/v1/public/*)
   |              |
   |              v
   |        Next.js server layer
   |          |           |
   |          v           v
   |      PostgreSQL   Cloudinary CDN
   |
Admin owner
   |
   v
Protected /admin dashboard
   |
   +---- Auth/session APIs
   +---- Admin APIs (/api/v1/admin/*)
                  |
                  v
          Next.js server layer
            |           |
            v           v
        PostgreSQL   Cloudinary signed upload
```

### Application layers

**Presentation:** Existing public pages and new protected admin pages.
Use Server Components for server-rendered read paths; Client Components
for interactive forms, uploads, sorting and previews.

**API/application:** Next.js Route Handlers, Zod validation, centralized
errors, service modules and server-side authorization.

**Data:** PostgreSQL + Prisma, migrations, indexes and transactions.

**Media:** Cloudinary for original assets, transformations and CDN
delivery. PostgreSQL stores verified `publicId`, `assetId`, URL, format,
dimensions, duration, bytes, alt text, caption and relationships.

## 3. Suggested project structure

Adapt to existing repository conventions; do not restructure unrelated
code.

``` text
src/
  app/
    (public)/
      page.tsx
      projects/page.tsx
      projects/[slug]/page.tsx
      services/page.tsx
      services/[slug]/page.tsx
    admin/
      login/page.tsx
      (protected)/
        layout.tsx
        page.tsx
        projects/page.tsx
        projects/new/page.tsx
        projects/[id]/edit/page.tsx
        media/page.tsx
        services/page.tsx
        homepage/page.tsx
        settings/page.tsx
        activity/page.tsx
    api/v1/
      auth/login/route.ts
      auth/logout/route.ts
      auth/session/route.ts
      admin/projects/route.ts
      admin/projects/[id]/route.ts
      admin/projects/[id]/publish/route.ts
      admin/projects/[id]/unpublish/route.ts
      admin/projects/[id]/archive/route.ts
      admin/media/signature/route.ts
      admin/media/confirm/route.ts
      admin/media/route.ts
      admin/media/[id]/route.ts
      admin/services/route.ts
      admin/settings/route.ts
      admin/homepage/route.ts
      public/homepage/route.ts
      public/projects/route.ts
      public/projects/[slug]/route.ts
      public/services/route.ts
      public/services/[slug]/route.ts
      public/settings/route.ts
  components/
    admin/
    public/
    shared/
  lib/
    auth/
    cloudinary/
    db/
    validation/
    http/
    cache/
  server/
    services/
    repositories/
    audit/
  types/
prisma/
  schema.prisma
  migrations/
  seed.ts
```

Mark secret-bearing modules with `server-only`. Never import Prisma or
Cloudinary secret modules into client components.

## 4. Database schema

Use UUID primary keys, UTC timestamps, foreign keys, explicit enums and
indexes. The following is a baseline design; validate it against the
installed Prisma version and correct relation fields before migration.

### Entities

-   `AdminUser`: one owner account.
-   `AdminSession`: revocable hashed sessions.
-   `ServiceCategory`: Electrical, Carpentry, Painting, Ceiling.
-   `Project`: project details, slug, category, status, featured flag
    and SEO.
-   `MediaAsset`: verified Cloudinary metadata.
-   `ProjectMedia`: project-to-media relation, role and order.
-   `ProjectHighlight`: project highlights.
-   `Service`: individual service details.
-   `SiteSetting`: allowlisted CMS settings.
-   `HomepageFeaturedProject`: curated featured project ordering.
-   `ActivityLog`: admin security and content activity.

### Prisma schema baseline

``` prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum MediaType {
  IMAGE
  VIDEO
}

enum MediaResourceType {
  IMAGE
  VIDEO
}

enum ProjectMediaRole {
  COVER
  GALLERY
  PROCESS
  BEFORE
  AFTER
}

enum AdminRole {
  OWNER
}

enum ActivityAction {
  LOGIN_SUCCESS
  LOGIN_FAILURE
  LOGOUT
  PROJECT_CREATED
  PROJECT_UPDATED
  PROJECT_PUBLISHED
  PROJECT_UNPUBLISHED
  PROJECT_ARCHIVED
  MEDIA_UPLOADED
  MEDIA_DELETED
  SERVICE_UPDATED
  SETTINGS_UPDATED
}

model AdminUser {
  id           String         @id @default(uuid()) @db.Uuid
  email        String         @unique
  passwordHash String
  displayName  String
  role         AdminRole      @default(OWNER)
  isActive     Boolean        @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  sessions     AdminSession[]
  activityLogs ActivityLog[]
}

model AdminSession {
  id            String    @id @default(uuid()) @db.Uuid
  adminUserId   String    @db.Uuid
  tokenHash     String    @unique
  expiresAt     DateTime
  lastSeenAt    DateTime  @default(now())
  createdAt     DateTime  @default(now())
  userAgent     String?
  ipAddressHash String?
  adminUser     AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@index([adminUserId])
  @@index([expiresAt])
}

model ServiceCategory {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  slug        String    @unique
  description String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  services    Service[]
  projects    Project[]

  @@index([isActive, sortOrder])
}

model Project {
  id               String          @id @default(uuid()) @db.Uuid
  title            String
  slug             String          @unique
  categoryId       String          @db.Uuid
  locationLabel    String?
  shortDescription String
  description      String?
  completionDate   DateTime?
  isFeatured       Boolean         @default(false)
  sortOrder        Int             @default(0)
  status           ContentStatus   @default(DRAFT)
  seoTitle         String?
  seoDescription   String?
  publishedAt      DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  archivedAt       DateTime?
  category         ServiceCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  media            ProjectMedia[]
  highlights       ProjectHighlight[]
  homepageFeature  HomepageFeaturedProject?

  @@index([status, publishedAt])
  @@index([categoryId, status, sortOrder])
  @@index([isFeatured, status, sortOrder])
  @@index([updatedAt])
}

model MediaAsset {
  id              String              @id @default(uuid()) @db.Uuid
  provider        String              @default("cloudinary")
  publicId        String              @unique
  assetId         String?             @unique
  resourceType    MediaResourceType
  mediaType       MediaType
  secureUrl       String
  format          String?
  mimeType        String?
  bytes           BigInt
  width           Int?
  height          Int?
  durationSeconds Float?
  originalName    String?
  altText         String?
  caption         String?
  folder          String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  projectLinks    ProjectMedia[]

  @@index([mediaType, createdAt])
}

model ProjectMedia {
  id           String           @id @default(uuid()) @db.Uuid
  projectId    String           @db.Uuid
  mediaAssetId String           @db.Uuid
  role         ProjectMediaRole @default(GALLERY)
  sortOrder    Int              @default(0)
  createdAt    DateTime         @default(now())
  project      Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  mediaAsset   MediaAsset       @relation(fields: [mediaAssetId], references: [id], onDelete: Restrict)

  @@unique([projectId, mediaAssetId])
  @@index([projectId, role, sortOrder])
}

model ProjectHighlight {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @db.Uuid
  text      String
  sortOrder Int      @default(0)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, sortOrder])
}

model Service {
  id               String          @id @default(uuid()) @db.Uuid
  categoryId       String          @db.Uuid
  title            String
  slug             String          @unique
  shortDescription String
  description      String?
  isActive         Boolean         @default(true)
  sortOrder        Int             @default(0)
  seoTitle         String?
  seoDescription   String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  category         ServiceCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@index([categoryId, isActive, sortOrder])
}

model SiteSetting {
  id        String   @id @default(uuid()) @db.Uuid
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

model HomepageFeaturedProject {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @unique @db.Uuid
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([sortOrder])
}

model ActivityLog {
  id          String         @id @default(uuid()) @db.Uuid
  adminUserId String?        @db.Uuid
  action      ActivityAction
  entityType  String?
  entityId    String?
  summary     String
  metadata    Json?
  createdAt   DateTime       @default(now())
  adminUser   AdminUser?     @relation(fields: [adminUserId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([adminUserId, createdAt])
}
```

### Schema implementation notes

-   Validate all Prisma relations and run `prisma validate` before
    migration.
-   Add a constraint/service invariant so each project has at most one
    `COVER` item. Replace cover inside a transaction.
-   `MediaAsset` deletion must be blocked while linked. Use safe detach
    and unused-asset cleanup.
-   `BigInt` values must serialize as strings in JSON.
-   Generate unique slugs with collision handling; database uniqueness
    is authoritative.
-   Seed the four categories: `electrical`, `carpentry`, `painting`,
    `ceiling`.
-   Add a relation from MediaAsset to AdminUser if ownership tracking is
    required; otherwise document why it is omitted.
-   Never run destructive resets against production.

## 5. Admin dashboard sitemap

``` text
/admin
  /login
  /                    Dashboard overview
  /projects
    /new
    /[id]/edit
  /media
  /services
  /homepage
  /settings
  /activity
```

### Page requirements

**Login** - Email/password. - No public registration. - Generic
invalid-credentials response. - Rate limiting. - Secure HTTP-only
session cookie.

**Dashboard** - Total projects, published, drafts, media count. - Recent
projects and recent activity. - Quick action to add a project.

**Projects** - Search, category/status filters, pagination and
sorting. - Featured indicator. - Edit, preview, publish, unpublish and
archive.

**Add/Edit project** - Title, slug, category, location. - Short/full
description. - Optional completion date. - Highlights. - Cover image. -
Multiple photos and videos. - Drag-and-drop media ordering. - Featured
toggle. - SEO title/description. - Save draft, preview and publish.

**Media library** - Image/video filters and search. - Preview,
dimensions, duration and file size. - Alt text and caption. - Linked
project indicator. - Safe delete only when unused.

**Services** - Manage four fixed top-level categories. - Edit service
descriptions and specialties. - Active/inactive state and display
order. - Prevent deleting categories used by projects.

**Homepage** - Select and reorder published featured projects. - Manage
hero/trust content only for explicitly approved editable fields. -
Preview before saving.

**Settings** - Business name, contact details, WhatsApp destination,
logo references and SEO defaults. - Never invent contact information.

**Activity** - Login events, project changes, publishing, media and
settings changes. - Read-only, paginated.

## 6. API specifications

Prefix all endpoints with `/api/v1`. Return consistent JSON.

Success:

``` json
{ "success": true, "data": {}, "meta": {} }
```

Error:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please review the submitted fields.",
    "fieldErrors": {}
  }
}
```

Never return stack traces, SQL details, secrets or raw provider errors.

### Authentication

  Method   Endpoint                 Access                 Purpose
  -------- ------------------------ ---------------------- -----------------
  POST     `/api/v1/auth/login`     Public, rate-limited   Admin login
  POST     `/api/v1/auth/logout`    Admin                  Revoke session
  GET      `/api/v1/auth/session`   Admin                  Current session

No signup endpoint.

### Admin projects

  Method   Endpoint                                 Purpose
  -------- ---------------------------------------- ------------------------
  GET      `/api/v1/admin/projects`                 Search/filter/paginate
  POST     `/api/v1/admin/projects`                 Create draft
  GET      `/api/v1/admin/projects/:id`             Read for editing
  PATCH    `/api/v1/admin/projects/:id`             Update
  POST     `/api/v1/admin/projects/:id/publish`     Validate and publish
  POST     `/api/v1/admin/projects/:id/unpublish`   Return to draft
  POST     `/api/v1/admin/projects/:id/archive`     Archive
  PATCH    `/api/v1/admin/projects/reorder`         Change display order
  PATCH    `/api/v1/admin/projects/:id/featured`    Set featured state

List query parameters: `q`, `category`, `status`, `featured`, `page`,
`pageSize`, `sort`. Enforce a maximum page size, such as 50.

### Media

  ---------------------------------------------------------------------------------
  Method                  Endpoint                          Purpose
  ----------------------- --------------------------------- -----------------------
  POST                    `/api/v1/admin/media/signature`   Generate short-lived
                                                            signed upload
                                                            parameters

  POST                    `/api/v1/admin/media/confirm`     Verify Cloudinary asset
                                                            and save metadata

  GET                     `/api/v1/admin/media`             List/search media

  PATCH                   `/api/v1/admin/media/:id`         Update alt text/caption

  DELETE                  `/api/v1/admin/media/:id`         Delete only if safely
                                                            unused
  ---------------------------------------------------------------------------------

**Secure upload sequence** 1. Admin requests signed upload parameters.
2. Server authenticates admin and validates resource type, folder,
format and limits. 3. Server generates a short-lived Cloudinary
signature using the server-side secret. 4. Browser uploads directly to
Cloudinary. 5. Browser submits returned asset identifiers to `/confirm`.
6. Server verifies the asset with Cloudinary; never trust
client-supplied URL, dimensions, duration, size or resource type. 7.
Server stores verified metadata. 8. Project form links the asset through
`ProjectMedia`.

Use server-generated folders such as
`mama-interior/projects/<project-id>`. Prevent arbitrary public
IDs/folders and duplicate confirmation. Suggested initial limits: images
15 MB, videos 100 MB, three concurrent uploads. Confirm these against
the Cloudinary plan and make them configurable.

### Services and site content

  Method   Endpoint                           Purpose
  -------- ---------------------------------- -----------------------------
  GET      `/api/v1/admin/services`           List services/categories
  POST     `/api/v1/admin/services`           Create service
  PATCH    `/api/v1/admin/services/:id`       Update service
  PATCH    `/api/v1/admin/services/reorder`   Reorder
  GET      `/api/v1/admin/homepage`           Read homepage config
  PUT      `/api/v1/admin/homepage`           Update featured content
  GET      `/api/v1/admin/settings`           Read settings
  PATCH    `/api/v1/admin/settings`           Update allowlisted settings

### Public read APIs

  Method   Endpoint                          Purpose
  -------- --------------------------------- -----------------------------
  GET      `/api/v1/public/homepage`         Published homepage content
  GET      `/api/v1/public/projects`         Published project list
  GET      `/api/v1/public/projects/:slug`   Published project detail
  GET      `/api/v1/public/services`         Active services
  GET      `/api/v1/public/services/:slug`   Active service detail
  GET      `/api/v1/public/settings`         Public allowlisted settings

Public API rules: - Only `PUBLISHED` projects. - Only active services. -
Draft and archived projects excluded; return 404 for their detail
URLs. - No admin IDs, logs, private metadata or provider credentials. -
Deterministic ordering and bounded pagination. - Return only required
media fields.

## 7. Security and operations

### Authentication

-   Use a maintained session approach compatible with the installed
    Next.js version.
-   Prefer opaque random session tokens stored hashed in the database,
    or a vetted secure session library.
-   Cookies: HttpOnly, Secure in production, appropriate SameSite,
    correct path.
-   Rotate session at login; revoke on logout; enforce expiry and active
    account status.
-   Hash passwords with Argon2id or appropriately configured bcrypt.
-   Bootstrap owner through a secure one-time CLI/seed using environment
    variables; never commit credentials.

### Authorization and input

-   Every admin API checks the session and active account.
-   Enforce authorization in service functions, not only UI.
-   Use Zod validation for all external input.
-   Apply CSRF/origin protection to cookie-authenticated mutations.
-   Rate-limit login and upload-signature endpoints.
-   Restrict request sizes and allowed settings keys.
-   Never accept arbitrary rich HTML without sanitization.

### Environment variables

``` env
DATABASE_URL=
SESSION_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

Only the cloud name may be public if required. Never prefix API secrets
or session secrets with `NEXT_PUBLIC_`.

### Operations

-   Automated PostgreSQL backups and tested restore.
-   Separate staging and production Cloudinary credentials/folders.
-   Do not delete Cloudinary assets while linked.
-   Log errors without passwords, session tokens or signed payloads.
-   Monitor database and upload failures.
-   Document migrations, rollback and recovery.

## 8. Publishing workflow

``` text
Create draft
  -> Add details and media
  -> Save draft
  -> Preview public page
  -> Validate required fields
  -> Publish
  -> Revalidate public routes/cache
  -> Visible on website
```

Before publishing require title, unique slug, category, short
description, valid cover image and valid media relationships. Unpublish
returns to `DRAFT`; archive sets `ARCHIVED`. Do not hard-delete by
default.

## 9. Cache and public website integration

After a successful publish/update: - Revalidate the project detail
path. - Revalidate projects listing. - Revalidate homepage if featured
content changes. - Revalidate service/settings pages when affected. - If
slug changes, revalidate old and new paths and consider a redirect.

Suggested cache tags: - `public-projects` - `public-project:<slug>` -
`public-homepage` - `public-services` - `public-settings`

Keep existing visual components. Replace hardcoded data gradually with
typed server-side data access. Add loading, empty and error states.
Preserve sorting and category filters. Do not replace authentic photos
with stock images.

## 10. Testing strategy

**Unit:** Zod schemas, slug collision handling, publish validation,
media validation, public filtering, authorization and revalidation
helpers.

**Integration:** - Login/logout/session expiry. - Unauthenticated admin
request returns 401. - Public write is rejected. - Draft never appears
publicly. - Published project appears. - Unpublish/archive removes it. -
Featured ordering is deterministic. - Linked media cannot be deleted. -
Fake Cloudinary metadata is rejected. - Retry does not duplicate media.

**E2E:** Login, create project, upload cover/gallery/video, save draft,
preview, publish, verify homepage/gallery/detail, edit,
unpublish/archive and verify public behavior.

Also test mobile dashboard, failed uploads, unsupported formats, session
expiry and missing media.

------------------------------------------------------------------------

# 11. Phased Antigravity implementation prompts

Run each phase separately. Review the results and approve before
starting the next phase.

## Global instruction for every phase

-   Read and follow `AGENTS.md`.
-   Inspect the real repository before editing.
-   Preserve existing MAMA INTERIOR public UI and behavior.
-   Do not invent business data.
-   Do not change unrelated sections.
-   Reuse installed dependencies where appropriate.
-   Use strict TypeScript and Zod validation.
-   Keep secrets server-only.
-   Run relevant tests, lint, type-check and build.
-   Report exact files and actual command results.
-   Stop after the phase and wait for approval.

### PHASE 0 --- Repository audit (no code changes)

``` text
You are the senior engineer responsible for MAMA INTERIOR CMS.

Confirmed stack: existing Next.js + TypeScript, Next.js Route Handlers, PostgreSQL, Prisma, Cloudinary, one owner/admin account.

Inspect the actual repository:
1. Installed Next.js, React, TypeScript and package manager versions.
2. Existing app structure, routes, project/service data and public components.
3. Deployment assumptions and environment configuration without exposing secrets.
4. Existing Prisma, database, Cloudinary and authentication dependencies.
5. AGENTS.md and repository conventions.
6. Every location where hardcoded project/service content is rendered.
7. Current rendering, caching and deployment behavior.

Produce current architecture, proposed adapted structure, dependency changes with reasons, migration risks, phased plan and tests.

Do not modify files in this phase. Do not guess missing configuration. Stop and report for approval.
```

### PHASE 1 --- Database and backend foundation

``` text
Implement only the database/backend foundation for MAMA INTERIOR CMS.

1. Add Prisma compatible with the repository.
2. Implement AdminUser, AdminSession, ServiceCategory, Project, MediaAsset, ProjectMedia, ProjectHighlight, Service, SiteSetting, HomepageFeaturedProject and ActivityLog.
3. Validate relations, indexes, foreign keys and delete behavior.
4. Seed Electrical, Carpentry, Painting and Ceiling categories.
5. Add a Next.js-safe Prisma singleton.
6. Add server-only database modules.
7. Validate required environment variables without printing secrets.
8. Create migrations and document safe migration commands.
9. Add core project/category repository functions.

Do not build dashboard UI, Cloudinary uploads or replace public hardcoded data yet. Never run destructive resets or production migrations.

Run Prisma validation/generation, development migration, seed verification, type-check and relevant tests. Report and stop for approval.
```

### PHASE 2 --- Single-admin authentication

``` text
Implement secure single-owner authentication.

- No public registration.
- Secure one-time owner bootstrap using environment variables or an interactive secure CLI.
- Argon2id or appropriately configured bcrypt password hashing.
- Opaque random session tokens stored only as hashes, or a vetted secure session library.
- HttpOnly, Secure-in-production and appropriate SameSite cookies.
- Rotate session on login, revoke on logout, enforce expiry and active status.
- Rate-limit login.
- Generic invalid-credentials response.
- CSRF/origin protection for cookie-authenticated mutations.
- Reusable server-side requireAdmin/session guards.
- Audit login success/failure and logout without logging credentials/tokens.

Endpoints:
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/auth/session

Test valid/invalid login, throttling, expiry, logout invalidation, inactive admin and unauthenticated requests. Never expose hashes or secrets. Stop for approval.
```

### PHASE 3 --- Dashboard shell and project UI

``` text
Build the protected admin dashboard and project screens.

Routes:
- /admin/login
- /admin
- /admin/projects
- /admin/projects/new
- /admin/projects/[id]/edit

Create a professional responsive light dashboard with sidebar, mobile navigation, top bar, owner identity and logout.

Dashboard: project/published/draft/media metrics, recent projects/activity, add-project action.

Project list: search, category/status filters, pagination, sorting, featured indicator and actions.

Project form: title, slug, category, location, short/full descriptions, optional completion date, highlights, featured toggle, SEO fields and draft save.

Use server-validated forms and shared Zod schemas. Add upload placeholders only; Cloudinary comes later. All mutations use protected APIs. Preserve public website. Test validation and responsive behavior. Stop for approval.
```

### PHASE 4 --- Cloudinary media library

``` text
Implement secure Cloudinary image/video management.

- Server-only Cloudinary SDK configuration.
- Authenticated POST /api/v1/admin/media/signature.
- Short-lived signed upload parameters.
- Restrict resource types, formats, folders and file sizes.
- Direct browser-to-Cloudinary upload.
- Progress, retry and max-three concurrent uploads.
- POST /api/v1/admin/media/confirm verifies asset with Cloudinary server-side.
- Save verified metadata to MediaAsset.
- Media Library filters, search, previews, alt text and captions.
- Safe deletion only when media is unused.
- Idempotent confirmation/retry behavior.

Never trust client-supplied URL, size, dimensions, duration or resource type. Never expose CLOUDINARY_API_SECRET. Use server-generated project folders and disallow arbitrary public IDs.

Initial configurable limits: image 15 MB, video 100 MB; confirm provider plan constraints. Test invalid type, oversize, failure, retry, duplicate confirmation and linked-media deletion. Stop for approval.
```

### PHASE 5 --- Project media and publishing

``` text
Integrate Cloudinary media into project create/edit.

Support one cover, multiple gallery images, multiple videos, ordering, roles, alt text and captions.

Implement:
- Save draft.
- Preview.
- Publish.
- Unpublish to draft.
- Archive.
- Required-field server validation.
- At most one cover per project, replaced transactionally.
- Verify media exists and is authorized before linking.
- Activity logs for create/update/publish/unpublish/archive.

Use transactions for related project/media updates. Draft and archived projects must never appear in public queries. Do not hard-delete by default.

Test lifecycle and public exclusion. Stop for approval.
```

### PHASE 6 --- Public website integration

``` text
Connect the existing public website to CMS data without redesigning it.

Public endpoints:
GET /api/v1/public/homepage
GET /api/v1/public/projects
GET /api/v1/public/projects/:slug
GET /api/v1/public/services
GET /api/v1/public/services/:slug
GET /api/v1/public/settings

Only published projects and active services are public. Exclude admin-only fields. Use stable slugs, deterministic sort order, curated featured projects, bounded pagination and per-project SEO/Open Graph metadata.

Replace hardcoded project data gradually while preserving existing card components, layout, filters and interactions. Use server-side data access where practical. Add loading/empty/error states. Revalidate affected paths/tags after publish, unpublish, archive and edit. Handle old/new slug paths.

Migrate only verified existing content; never fabricate details or replace authentic photos with stock images. Test public listing, categories, detail pages, drafts, missing content and mobile. Stop for approval.
```

### PHASE 7 --- Services and homepage settings

``` text
Add controlled CMS management for services, featured projects and approved site settings.

- Keep top-level categories Electrical, Carpentry, Painting and Ceiling.
- Edit service descriptions, specialties, active state and order.
- Prevent deleting categories referenced by projects.
- Select/reorder featured published projects.
- Allow edits to only explicitly allowlisted hero/trust copy fields.
- Manage real business contact and WhatsApp details only when supplied.
- Validate settings with Zod and server allowlists.
- Add preview/confirmation and audit logs.
- Revalidate affected public pages.

Do not build a free-form page builder or allow arbitrary JSON to change layout, scripts or theme. Test public rendering. Stop for approval.
```

### PHASE 8 --- Production hardening

``` text
Perform production hardening for the CMS.

Audit authentication, sessions, authorization, CSRF, rate limits, validation, upload verification, media deletion safety, public data exposure, migrations, indexes, caching, errors, logging, accessibility and responsive admin UI.

Add unit, integration and E2E coverage for login, project lifecycle, draft exclusion, media confirmation, safe deletion, featured order and cache revalidation.

Run lint, type-check, tests and production build. Document local setup, environment variables, first admin bootstrap, migrations, Cloudinary setup, upload limits, deployment, backup/restore and troubleshooting.

Do not deploy or change production data without explicit approval. Report actual command results, remaining risks and deployment prerequisites. Stop for approval.
```

## 12. Deployment checklist

-   [ ] Production PostgreSQL provisioned.
-   [ ] Backups enabled and restore tested.
-   [ ] Cloudinary production folders/credentials configured.
-   [ ] Separate staging and production secrets.
-   [ ] Environment variables configured securely.
-   [ ] Owner account bootstrapped securely.
-   [ ] HTTPS and secure cookies verified.
-   [ ] Reviewed database migrations applied.
-   [ ] Published and draft visibility verified.
-   [ ] Upload limits and media delivery tested.
-   [ ] Sitemap and project metadata verified.
-   [ ] Error monitoring configured.
-   [ ] Rollback procedure documented.

## 13. Decisions to confirm during repository audit

Do not guess: - Exact Next.js, Prisma and Node versions. - Hosting and
deployment platform. - Existing database provider. - Existing
authentication dependencies. - Cloudinary plan limits. - Existing
rendering/caching strategy. - Where current project photos are stored. -
Whether staging already exists.

## 14. Recommended execution order

  Order   Phase                  Approval gate
  ------- ---------------------- ----------------------
  1       Repository audit       Architecture
  2       Database foundation    Schema/migration
  3       Authentication         Security flow
  4       Dashboard/project UI   UX
  5       Cloudinary media       Upload flow
  6       Project publishing     CMS lifecycle
  7       Public integration     Website behavior
  8       Services/settings      Content controls
  9       Hardening              Deployment readiness

**Do not run all phases in one Antigravity request.** Complete, inspect
and approve each phase before continuing. This reduces regressions and
isolates database, security and upload issues.
