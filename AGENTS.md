# AGENTS.md --- MAMA INTERIOR CMS

> **Purpose:** This file defines the mandatory engineering,
> architecture, UI/UX, security, quality and delivery standards for
> every AI agent or developer working on the MAMA INTERIOR CMS.
>
> **Project context:** MAMA INTERIOR is an individual interior-work
> contractor business in India. The business undertakes Electrical
> Installation & Wiring, Carpentry & Custom Woodwork, Painting & Surface
> Finishes, and False Ceiling & POP work. The public website already
> exists and must remain visually consistent while a secure,
> owner-operated CMS and admin dashboard are added.

------------------------------------------------------------------------

## 1. Role and engineering expectations

Act as a **Senior/Staff Full-Stack Engineer, Solution Architect,
Security Engineer and Product-minded UI Engineer**.

You are responsible for delivering production-quality software, not
merely making screens that look plausible.

For every task:

1.  Inspect the existing repository and understand its conventions
    before editing.
2.  Identify the actual source files, dependencies, framework versions
    and current behavior.
3.  State a concise implementation plan before making broad changes.
4.  Implement the smallest complete change that solves the task.
5.  Reuse existing components, utilities, styles and dependencies where
    appropriate.
6.  Validate server-side and client-side behavior.
7.  Run relevant tests, lint, type-check and build commands.
8.  Review the diff for regressions, accidental scope expansion,
    security leaks and dead code.
9.  Report exactly what changed, what was tested, actual results and any
    remaining risks.
10. Stop at phase boundaries and wait for approval before starting the
    next phase.

Never claim a command or test passed unless it was actually executed and
its result observed.

## 2. Confirmed product and architecture decisions

These decisions are fixed unless the project owner explicitly changes
them.

  -----------------------------------------------------------------------
  Area                                Decision
  ----------------------------------- -----------------------------------
  Business                            MAMA INTERIOR --- individual
                                      contractor

  Market                              India

  Main work categories                Electrical, Carpentry, Painting,
                                      False Ceiling

  Existing public site                Preserve and progressively connect
                                      to CMS

  Frontend                            Existing Next.js + TypeScript
                                      application

  Backend                             Next.js App Router Route Handlers
                                      in the same codebase

  Database                            PostgreSQL

  ORM                                 Prisma

  Media storage                       Cloudinary for images and videos

  Admin model                         One owner/admin account initially

  Authentication                      Secure server-managed sessions; no
                                      public registration

  Content lifecycle                   Draft → Preview → Publish;
                                      unpublish to Draft; Archive

  Public visibility                   Published projects and active
                                      services only
  -----------------------------------------------------------------------

Do not introduce a separate Express backend, Firebase authentication, a
second database, or another media provider without explicit approval.

Do not assume exact framework, ORM, Node.js, hosting or provider
versions. Inspect `package.json`, lockfiles and deployment configuration
first.

## 3. Product goals

The CMS must let the owner manage the website without developer
assistance for routine content updates.

The owner must be able to:

-   Sign in to a protected admin dashboard.
-   View project and media summaries.
-   Create, edit, preview, publish, unpublish and archive projects.
-   Assign projects to Electrical, Carpentry, Painting or False Ceiling.
-   Upload one cover image and multiple gallery images/videos.
-   Reorder project media.
-   Add project descriptions, location labels, completion dates and
    highlights.
-   Manage service descriptions and specialties.
-   Choose and reorder featured projects on the homepage.
-   Manage only approved homepage copy and business settings.
-   Preview changes before publishing.
-   View a basic activity history.

The public website must automatically reflect published CMS content
while retaining its current design, responsive behavior, animations and
navigation.

## 4. Non-negotiable scope and safety boundaries

### 4.1 Preserve the existing website

-   Do not redesign the public website as part of CMS work unless
    specifically requested.
-   Do not change the existing hero, navbar, service cards, trust strip,
    portfolio layouts, typography, colors or animation behavior merely
    to make CMS integration easier.
-   Preserve existing routes and working interactions.
-   Replace hardcoded data incrementally, one area at a time.
-   Keep existing authentic project photos and videos.
-   Never substitute stock imagery for real project evidence without
    approval.
-   Do not fabricate project names, locations, materials,
    certifications, guarantees, client testimonials, completion dates or
    business claims.

### 4.2 Avoid unrelated changes

-   Do not modify unrelated components, dependencies, configuration or
    deployment settings.
-   Do not delete files simply because they appear unused; verify
    references first.
-   Do not perform destructive database resets.
-   Never run production migrations or change production data without
    explicit approval.
-   Never deploy to production without explicit approval.
-   Preserve user changes and uncommitted work. Inspect `git status`
    before editing and never overwrite unrelated modifications.

### 4.3 Do not overbuild

-   No free-form page builder in the initial release.
-   No multi-tenant architecture.
-   No public user accounts or customer portal.
-   No unnecessary microservices, queues or event bus for this small
    CMS.
-   No analytics suite or complex role system unless requested.
-   Keep the first release focused on reliable project and media
    management.

## 5. Mandatory workflow

For every phase or task use this sequence:

### Step 1 --- Inspect

-   Read this `AGENTS.md`.
-   Inspect repository tree and relevant source files.
-   Check `git status` and current branch.
-   Inspect installed package versions and scripts.
-   Find existing patterns for routing, forms, API responses, styling,
    auth, validation and tests.
-   Identify existing project/service data and how it reaches the public
    UI.

### Step 2 --- Plan

-   List files expected to change.
-   Explain the implementation approach.
-   Identify schema/API/security implications.
-   Identify risks and tests.
-   Ask for clarification only when a decision is genuinely blocking.

### Step 3 --- Implement

-   Follow existing project conventions.
-   Use small, cohesive modules.
-   Keep types explicit.
-   Validate all untrusted input.
-   Keep server-only logic isolated.
-   Avoid duplicated business rules.

### Step 4 --- Verify

Run the relevant available commands, such as: - package manager lint
script; - TypeScript type-check; - unit/integration tests; - Prisma
validation/generation; - production build.

Use the actual package manager identified from the lockfile. Do not
assume npm, pnpm, yarn or bun.

### Step 5 --- Review

-   Inspect `git diff`.
-   Check for leaked secrets, unsafe HTML, missing auth checks and
    accidental public exposure.
-   Check responsive behavior and accessibility.
-   Check that existing public pages remain unchanged except for
    intended data integration.

### Step 6 --- Report and stop

Report: - Summary of implementation. - Files changed. - Database/API
changes. - Commands executed and actual results. - Manual checks
completed. - Known limitations and remaining risks. - Next phase
recommendation.

Do not silently continue into the next phase.

------------------------------------------------------------------------

# PART A --- ARCHITECTURE AND CODE ORGANIZATION

## 6. Architecture principles

Use a modular monolith within the existing Next.js application.

-   Next.js App Router owns public routes, admin routes and Route
    Handlers.
-   Route Handlers are thin HTTP adapters.
-   Business logic belongs in server-side service modules.
-   Prisma access belongs in server-side repositories/data-access
    modules.
-   Zod schemas validate all external input.
-   Cloudinary integration belongs in a server-only provider module.
-   Public data access must be separate from admin data access.
-   Shared types must not import server-only modules.
-   Client components must never import Prisma, database credentials,
    Cloudinary API secrets or session signing secrets.

Do not put all business logic in route files or React components.

## 7. Suggested directory structure

Adapt this structure to the actual repository. Do not move existing
files unnecessarily.

``` text
src/
  app/
    (public)/
      page.tsx
      projects/
        page.tsx
        [slug]/
          page.tsx
      services/
        page.tsx
        [slug]/
          page.tsx

    admin/
      login/
        page.tsx
      (protected)/
        layout.tsx
        page.tsx
        projects/
          page.tsx
          new/
            page.tsx
          [id]/
            edit/
              page.tsx
        media/
          page.tsx
        services/
          page.tsx
        homepage/
          page.tsx
        settings/
          page.tsx
        activity/
          page.tsx

    api/
      v1/
        auth/
          login/route.ts
          logout/route.ts
          session/route.ts
        admin/
          projects/route.ts
          projects/[id]/route.ts
          projects/[id]/publish/route.ts
          projects/[id]/unpublish/route.ts
          projects/[id]/archive/route.ts
          media/signature/route.ts
          media/confirm/route.ts
          media/route.ts
          media/[id]/route.ts
          services/route.ts
          homepage/route.ts
          settings/route.ts
        public/
          homepage/route.ts
          projects/route.ts
          projects/[slug]/route.ts
          services/route.ts
          services/[slug]/route.ts
          settings/route.ts

  components/
    admin/
      layout/
      navigation/
      dashboard/
      projects/
      media/
      services/
      forms/
      settings/
    public/
    shared/

  lib/
    auth/
    cloudinary/
    db/
    http/
    validation/
    cache/
    utils/

  server/
    services/
    repositories/
    audit/

  types/

prisma/
  schema.prisma
  migrations/
  seed.ts

public/
  images/
  icons/
```

## 8. Layer responsibilities

### Route Handlers

-   Parse request.
-   Authenticate/authorize when admin-only.
-   Validate body, query and route parameters.
-   Call a service.
-   Return a consistent HTTP response.
-   Do not contain complex business logic.

### Service layer

-   Enforce business rules.
-   Check ownership/relationships.
-   Perform transactions.
-   Enforce publishing requirements.
-   Write audit events.
-   Trigger cache revalidation after successful mutations.

### Repository/data layer

-   Encapsulate Prisma queries.
-   Keep public queries separate from admin queries.
-   Select only fields needed by the caller.
-   Avoid returning sensitive columns.

### Validation

-   Use Zod schemas.
-   Share safe schemas between form and server where practical.
-   Do not trust client validation.
-   Validate all IDs, slugs, status changes, pagination and media
    references.

### UI layer

-   Reusable components.
-   Explicit loading, empty, error and success states.
-   No business authorization decisions based only on UI visibility.
-   No secrets or server SDKs in client bundles.

## 9. Dependency policy

Before adding any package: 1. Check whether the functionality already
exists. 2. Check compatibility with the installed Next.js/React version.
3. Prefer maintained, widely used libraries. 4. Explain why the
dependency is needed. 5. Avoid adding packages for trivial
functionality.

Potential packages, only if not already available and compatible: -
`prisma` and `@prisma/client` - `zod` - Cloudinary Node SDK - a vetted
session/authentication library or secure custom opaque-session
implementation - `argon2` or a properly configured password-hashing
library - form library only if the existing project needs it - icon
library already used by the public site

Do not install a second UI framework or a second styling system.

------------------------------------------------------------------------

# PART B --- DATABASE AND DOMAIN MODEL

## 10. Database rules

Use PostgreSQL + Prisma.

General rules: - UUID identifiers. - `createdAt` and `updatedAt`
timestamps. - UTC storage. - Foreign keys and explicit delete
behavior. - Unique constraints for email, slug and Cloudinary
identifiers. - Index fields used in filters and sorting. - Use
transactions for related writes. - Do not use JSON columns as a
substitute for core relational data. - Store media metadata, not media
binary data. - Serialize `BigInt` values safely as strings in JSON.

### Required entities

1.  `AdminUser`
2.  `AdminSession`
3.  `ServiceCategory`
4.  `Project`
5.  `MediaAsset`
6.  `ProjectMedia`
7.  `ProjectHighlight`
8.  `Service`
9.  `SiteSetting`
10. `HomepageFeaturedProject`
11. `ActivityLog`

### Service categories

Seed exactly these initial top-level categories:

  Name            Slug
  --------------- --------------
  Electrical      `electrical`
  Carpentry       `carpentry`
  Painting        `painting`
  False Ceiling   `ceiling`

Do not hardcode category labels in multiple places. Read them from the
database or a single typed source of truth.

### Project fields

A project should support: - title; - unique slug; - category; - optional
location label; - short description; - full description; - optional
completion date; - draft/published/archived status; - featured flag; -
display order; - cover image relationship; - multiple gallery images; -
multiple videos; - ordered highlights; - SEO title and description; -
created/updated/published timestamps.

### Media fields

Store: - provider; - Cloudinary `publicId`; - Cloudinary `assetId`; -
resource type; - media type; - verified secure URL; - format and MIME
type; - bytes; - dimensions; - optional video duration; - original
filename; - alt text; - caption; - folder; - timestamps.

Do not trust client-supplied metadata; verify it against Cloudinary
server-side.

### Relationship rules

-   One project can have multiple media assets.
-   One media asset can be linked to more than one project only if the
    product explicitly supports reuse.
-   A project may have at most one cover image.
-   Project media must have deterministic ordering.
-   Do not delete media while linked.
-   Project deletion should default to archive, not hard delete.
-   A category referenced by a project cannot be deleted.

### Prisma quality gate

Before migration: - Validate every relation. - Ensure inverse relation
fields exist. - Ensure unique/index constraints are correct. - Confirm
delete behavior. - Run Prisma schema validation and client generation. -
Create a reviewed migration. - Test migration on development/staging. -
Never use `db push` as a substitute for reviewed production migrations
unless explicitly approved for a disposable development environment.

------------------------------------------------------------------------

# PART C --- AUTHENTICATION AND SECURITY

## 11. Single-admin authentication

Initial release has one owner/admin account.

Requirements: - No public registration. - No default credentials
committed to source. - Bootstrap owner using a secure one-time CLI/seed
process. - Password stored as a strong hash, never plaintext. - Prefer
Argon2id or a vetted alternative configured appropriately. - Use secure
server-managed sessions. - Prefer opaque random session tokens stored
hashed in the database, or a vetted auth library. - Rotate session on
login. - Revoke session on logout. - Enforce expiration and active
account status. - Use `HttpOnly`, `Secure` in production, suitable
`SameSite` and correct cookie path. - Rate-limit login. - Return generic
invalid-credential messages. - Do not expose password hashes, session
tokens or session hashes. - Log authentication events without sensitive
values.

### Authorization

Every `/api/v1/admin/*` endpoint must: 1. Validate session. 2. Load the
active admin account. 3. Enforce owner permission. 4. Validate the
request. 5. Perform the action.

Authorization must be enforced server-side in service functions as
appropriate, not merely by hiding dashboard links.

### CSRF and request security

For cookie-authenticated mutations: - Use an appropriate CSRF defense. -
Validate origin where applicable. - Use correct SameSite cookie
policy. - Do not assume SameSite alone solves every CSRF scenario.

Also: - Apply rate limits to login and upload-signature endpoints. -
Limit request body size. - Validate content types. - Add secure response
headers. - Configure CSP to allow only necessary media domains. - Avoid
logging secrets, credentials, cookies or signed upload payloads.

### Environment variables

Expected names, adapt to the chosen deployment:

``` env
DATABASE_URL=
SESSION_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

Only the cloud name may be exposed publicly if needed. Never prefix API
secrets or session secrets with `NEXT_PUBLIC_`.

Validate required variables at startup or server initialization without
printing their values.

------------------------------------------------------------------------

# PART D --- CLOUDINARY MEDIA MANAGEMENT

## 12. Cloudinary architecture

Cloudinary stores original images and videos and delivers optimized
media through its CDN.

PostgreSQL stores verified metadata and relationships.

Use separate staging and production credentials/folders.

### Upload workflow

1.  Admin selects media in the dashboard.
2.  Browser requests upload authorization from the backend.
3.  Backend verifies admin session.
4.  Backend validates allowed resource type, format, folder and limits.
5.  Backend generates short-lived signed upload parameters using the
    Cloudinary API secret.
6.  Browser uploads directly to Cloudinary.
7.  Browser sends returned asset identifiers to the backend confirmation
    endpoint.
8.  Backend verifies asset metadata with Cloudinary.
9.  Backend stores verified metadata in PostgreSQL.
10. Project form links the asset to the project.

Never upload large media files through a Next.js Route Handler unless
there is a specific, reviewed reason. Prefer direct signed
browser-to-Cloudinary upload.

### Upload security

-   Server-generated folder names only.
-   Do not accept arbitrary Cloudinary public IDs.
-   Do not trust browser-supplied URL, byte count, dimensions, duration,
    MIME type or resource type.
-   Verify uploaded asset using Cloudinary server-side.
-   Restrict resource types and allowed formats.
-   Use short-lived signatures.
-   Prevent duplicate confirmations and retries.
-   Do not expose Cloudinary API secret.
-   Do not delete assets that are still linked to a project.

Suggested starting limits (must be confirmed against the Cloudinary plan
and made configurable): - Images: maximum 15 MB each. - Videos: maximum
100 MB each. - Maximum 3 concurrent uploads. - Allow only required
formats, initially JPEG, PNG, WebP and MP4/MOV where supported.

### Upload UX

-   Show per-file progress.
-   Show uploading, success and failed states.
-   Allow retry for failed uploads.
-   Prevent accidental duplicate submission.
-   Allow removal before saving.
-   Show preview and file metadata.
-   Show useful validation messages.
-   Keep form state if one upload fails.
-   Do not report upload success until Cloudinary verification and
    database persistence succeed.

### Media deletion

-   Block deletion when an asset is linked to any project.
-   Require explicit confirmation for deletion.
-   Use server-side Cloudinary deletion.
-   Handle provider/database partial failures safely.
-   Prefer a cleanup workflow for unused media over automatic
    destructive cleanup.

------------------------------------------------------------------------

# PART E --- CMS WORKFLOWS AND API CONTRACTS

## 13. Content lifecycle

Project lifecycle:

``` text
DRAFT
  |
  | preview and validate
  v
PUBLISHED
  |
  +---- unpublish ----> DRAFT
  |
  +---- archive ------> ARCHIVED
```

Before publish, require: - title; - unique slug; - category; - short
description; - valid cover image; - valid media relationships; -
server-side validation success.

Draft and archived content must never appear on public pages or public
APIs.

## 14. API conventions

Use `/api/v1`.

Success response:

``` json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error response:

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

Use appropriate HTTP status codes: - `200` successful read/update; -
`201` created; - `400` malformed/invalid request; - `401`
unauthenticated; - `403` authenticated but unauthorized; - `404` not
found or unpublished public content; - `409` unique/conflict/state
conflict; - `413` payload too large; - `422` validation failure if used
consistently; - `429` rate limited; - `500` unexpected server error.

Never expose stack traces, SQL details, internal paths, secrets or raw
provider errors.

### Authentication endpoints

  Method   Endpoint                 Access
  -------- ------------------------ ----------------------
  POST     `/api/v1/auth/login`     Public, rate-limited
  POST     `/api/v1/auth/logout`    Admin
  GET      `/api/v1/auth/session`   Admin

No signup endpoint.

### Admin project endpoints

  Method   Endpoint                                 Purpose
  -------- ---------------------------------------- ------------------------
  GET      `/api/v1/admin/projects`                 Search/filter/paginate
  POST     `/api/v1/admin/projects`                 Create draft
  GET      `/api/v1/admin/projects/:id`             Read edit data
  PATCH    `/api/v1/admin/projects/:id`             Update
  POST     `/api/v1/admin/projects/:id/publish`     Validate and publish
  POST     `/api/v1/admin/projects/:id/unpublish`   Return to draft
  POST     `/api/v1/admin/projects/:id/archive`     Archive
  PATCH    `/api/v1/admin/projects/reorder`         Reorder
  PATCH    `/api/v1/admin/projects/:id/featured`    Set featured

List query parameters: - `q` - `category` - `status` - `featured` -
`page` - `pageSize` - `sort`

Enforce bounded pagination (for example, maximum page size 50).

### Admin media endpoints

  Method   Endpoint                          Purpose
  -------- --------------------------------- -----------------------------
  POST     `/api/v1/admin/media/signature`   Signed upload authorization
  POST     `/api/v1/admin/media/confirm`     Verify and persist metadata
  GET      `/api/v1/admin/media`             List/search
  PATCH    `/api/v1/admin/media/:id`         Edit alt text/caption
  DELETE   `/api/v1/admin/media/:id`         Delete only if unused

### Services and settings

  Method   Endpoint                           Purpose
  -------- ---------------------------------- -----------------------------
  GET      `/api/v1/admin/services`           List services/categories
  POST     `/api/v1/admin/services`           Create service
  PATCH    `/api/v1/admin/services/:id`       Update service
  PATCH    `/api/v1/admin/services/reorder`   Reorder
  GET      `/api/v1/admin/homepage`           Read homepage configuration
  PUT      `/api/v1/admin/homepage`           Update featured content
  GET      `/api/v1/admin/settings`           Read settings
  PATCH    `/api/v1/admin/settings`           Update allowlisted settings

Settings must use a strict allowlist. Do not let arbitrary JSON change
application behavior, layout, scripts or theme.

### Public endpoints

  Method   Endpoint                          Purpose
  -------- --------------------------------- -----------------------------
  GET      `/api/v1/public/homepage`         Published homepage content
  GET      `/api/v1/public/projects`         Published projects
  GET      `/api/v1/public/projects/:slug`   Published project detail
  GET      `/api/v1/public/services`         Active services
  GET      `/api/v1/public/services/:slug`   Active service detail
  GET      `/api/v1/public/settings`         Public allowlisted settings

Public endpoint rules: - Only published projects. - Only active
services. - Never expose admin data, audit logs or private metadata. -
Return 404 for draft/archived project details. - Use deterministic
ordering. - Return only fields needed by public pages. - Validate
filters and pagination.

------------------------------------------------------------------------

# PART F --- ADMIN UI/UX DESIGN SYSTEM

## 15. Admin visual direction

The admin dashboard should feel like a premium, dependable
content-management tool for a small professional contracting business.

Design principles: - Clean, calm, professional and easy to learn. -
Light theme by default. - Clear hierarchy and generous but efficient
spacing. - Consistent typography, color tokens, radii, shadows and
controls. - Avoid visual clutter, excessive gradients, glassmorphism and
decorative animation. - Use restrained warm accent colors that
complement the existing MAMA INTERIOR brand. - Reuse the public website
brand identity, but optimize admin UI for productivity. - The admin
dashboard is not a second marketing website.

Do not invent brand colors or fonts. Inspect the existing public design
tokens, logo and typography and reuse compatible values. If design
tokens are missing, propose a small centralized token set and request
approval before changing public styles.

### Layout

Desktop: - Fixed/collapsible left sidebar. - Compact top bar. - Main
content with consistent max width. - Page title, short description and
primary action. - Cards and tables aligned to a grid.

Tablet: - Collapsible navigation. - Two-column metric cards where space
permits. - Tables adapt with horizontal scroll or stacked row layout.

Mobile: - Drawer or compact navigation. - Single-column forms. -
Full-width primary actions. - Upload drop zone remains usable. - No
horizontal page overflow. - Tables become cards or controlled horizontal
scrollers.

### Navigation

Suggested sidebar: - Overview - Projects - Media Library - Services -
Homepage - Settings - Activity Log

Show active route clearly. Use icons consistently from the project's
existing icon library.

### Components to build once and reuse

-   `AdminShell`
-   `AdminSidebar`
-   `AdminHeader`
-   `PageHeader`
-   `StatCard`
-   `DataTable`
-   `StatusBadge`
-   `SearchInput`
-   `FilterBar`
-   `Pagination`
-   `EmptyState`
-   `ErrorState`
-   `LoadingSkeleton`
-   `ConfirmDialog`
-   `FormField`
-   `ImageUploader`
-   `VideoUploader`
-   `MediaPicker`
-   `MediaPreview`
-   `SortableMediaGrid`
-   `ProjectStatusActions`
-   `Toast/notification`

Avoid duplicating form controls and status logic across pages.

### Interaction standards

-   Destructive actions require confirmation.
-   Publish action clearly explains public visibility.
-   Save draft and publish are distinct actions.
-   Prevent double submissions.
-   Disable actions while requests are pending.
-   Show field-level validation errors.
-   Preserve form data when a request fails.
-   Use optimistic updates only where rollback is safe.
-   Always provide feedback after mutations.
-   Avoid alert boxes for routine feedback; use consistent toast/inline
    feedback.
-   Confirm navigation away from unsaved edits.
-   Provide accessible labels and keyboard operation.

### Animation

-   Keep admin animation subtle and purposeful.
-   Use short transitions for navigation, dropdowns and dialogs.
-   No scroll-triggered decorative animation in admin.
-   Respect `prefers-reduced-motion`.
-   Do not introduce a new animation dependency without approval.

## 16. Accessibility

Target WCAG 2.1 AA where practical.

-   Semantic headings and landmarks.
-   Visible focus indicators.
-   Keyboard-accessible navigation, menus and dialogs.
-   Correct labels and descriptions for every form field.
-   Error messages associated with fields.
-   Sufficient text/background contrast.
-   Do not communicate status through color alone.
-   Alt text for meaningful project images.
-   Accessible upload controls and progress announcements.
-   Dialog focus management and escape behavior.
-   Respect reduced-motion preferences.

------------------------------------------------------------------------

# PART G --- PUBLIC WEBSITE INTEGRATION

## 17. Preserve the public presentation

The public website is already designed. CMS work must not
unintentionally change: - Hero dimensions, background, overlay or text
positioning. - Transparent-to-solid navbar behavior. - Existing section
spacing. - Trust strip design and scroll animations. - Four service
cards and their current visual system. - Portfolio card design and image
overlays. - Process section. - Contact CTA and WhatsApp links. -
Typography, colors and responsive behavior.

Before integration, capture or record baseline screenshots at desktop,
tablet and mobile widths.

After each integration phase, compare the same routes and viewports.

## 18. Data integration approach

-   Keep existing presentation components.
-   Create typed view models matching the data those components require.
-   Fetch public data server-side where practical.
-   Do not fetch server-only data from the browser unnecessarily.
-   Replace hardcoded arrays gradually.
-   Add intentional loading, empty and error states.
-   Preserve ordering and category filter behavior.
-   Use Cloudinary delivery URLs from verified database records.
-   Generate per-project metadata and Open Graph image.
-   Ensure unpublished projects are inaccessible even if a visitor
    guesses the slug.

### Caching and revalidation

After publish/update/unpublish/archive: - Revalidate the project detail
path. - Revalidate projects listing. - Revalidate homepage when featured
content changes. - Revalidate services/settings when changed. - If slug
changes, revalidate old and new paths and consider redirecting the old
slug.

Use a consistent Next.js caching strategy. Suggested tags: -
`public-projects` - `public-project:<slug>` - `public-homepage` -
`public-services` - `public-settings`

Do not mix uncontrolled client caching with server caching.

------------------------------------------------------------------------

# PART H --- TESTING, OBSERVABILITY AND DEPLOYMENT

## 19. Testing requirements

### Unit tests

-   Zod schemas.
-   Slug generation/collision handling.
-   Publish validation.
-   Public content filtering.
-   Media metadata validation.
-   Authorization helpers.
-   Revalidation target generation.

### Integration tests

-   Login/logout/session expiry.
-   Inactive admin rejected.
-   Unauthenticated admin endpoint returns 401.
-   Public mutation is rejected.
-   Draft project never appears publicly.
-   Published project appears publicly.
-   Unpublish removes project from public responses.
-   Archive removes project from public responses.
-   Featured order is deterministic.
-   Linked media cannot be deleted.
-   Fabricated Cloudinary metadata is rejected.
-   Upload retry does not create duplicate records.

### E2E tests

1.  Owner logs in.
2.  Creates project.
3.  Uploads cover image.
4.  Uploads gallery images and video.
5.  Saves draft.
6.  Previews project.
7.  Publishes.
8.  Verifies homepage if featured.
9.  Verifies projects listing and project detail.
10. Edits project.
11. Unpublishes or archives.
12. Verifies public visibility is removed.

### Manual testing

-   Desktop, tablet and mobile.
-   Failed/slow upload.
-   Unsupported file.
-   Oversized file.
-   Multiple uploads.
-   Retry.
-   Session expiry.
-   Browser refresh during edit.
-   Empty database.
-   Broken media response.
-   Unsaved form navigation.

## 20. Logging and monitoring

-   Record admin actions in `ActivityLog`.
-   Log server errors with safe contextual IDs.
-   Never log passwords, cookies, session tokens, Cloudinary secrets or
    signed upload parameters.
-   Monitor database connectivity, API error rates and media upload
    failures.
-   Use request IDs/correlation IDs if already supported.
-   Keep public error messages generic and detailed diagnostics
    server-side.

## 21. Backup and recovery

-   Configure automated PostgreSQL backups.
-   Test restoration, not just backup creation.
-   Document migration rollback/recovery.
-   Avoid deleting Cloudinary assets automatically.
-   Keep staging and production media separated.
-   Document what happens if database metadata and Cloudinary assets
    become inconsistent.
-   Prefer recoverable archive/soft-delete behavior.

## 22. Deployment checklist

Before production: - \[ \] Production PostgreSQL configured. - \[ \]
Backup and restore tested. - \[ \] Cloudinary production account/folders
configured. - \[ \] Staging and production secrets separated. - \[ \]
Environment variables configured securely. - \[ \] Owner account
bootstrapped securely. - \[ \] HTTPS enabled. - \[ \] Secure cookies
verified. - \[ \] Database migration reviewed and applied. - \[ \]
Public draft exclusion verified. - \[ \] Upload limits tested. - \[ \]
Cloudinary delivery tested. - \[ \] Sitemap and metadata verified. - \[
\] Monitoring/logging configured. - \[ \] Rollback plan documented. - \[
\] Owner trained on adding and publishing a project.

Never deploy or migrate production without explicit approval.

------------------------------------------------------------------------

# PART I --- PHASED DELIVERY AND APPROVAL GATES

## 23. Mandatory phase order

The project must be implemented in this order. Do not combine phases
into one large implementation run.

  -----------------------------------------------------------------------
  Phase                   Scope                   Approval gate
  ----------------------- ----------------------- -----------------------
  0                       Repository audit, no    Architecture and risks
                          code changes            approved

  1                       Prisma schema, database Schema and migration
                          foundation, seed        approved

  2                       Secure single-admin     Auth/security flow
                          authentication          approved

  3                       Dashboard shell and     Admin UX approved
                          project forms/list      

  4                       Cloudinary media        Upload flow approved
                          library and secure      
                          uploads                 

  5                       Project media           CMS lifecycle approved
                          relationships and       
                          publishing              

  6                       Public website data     Public behavior and
                          integration             visual parity approved

  7                       Services, homepage and  Content controls
                          settings management     approved

  8                       Hardening, tests and    Deployment approved
                          production readiness    
  -----------------------------------------------------------------------

At the end of each phase: - Stop. - Report changed files. - Report
database/API changes. - Report tests and actual command output. - List
known issues. - Ask for approval to continue.

## 24. Phase 0 --- Repository audit prompt

``` text
You are the senior engineer responsible for MAMA INTERIOR CMS.

Read AGENTS.md fully and follow it.

Confirmed architecture:
- Existing Next.js + TypeScript application.
- Next.js App Router Route Handlers.
- PostgreSQL + Prisma.
- Cloudinary media storage.
- Single owner/admin.
- Preserve current public website.

Inspect the real repository:
1. Installed Next.js, React, TypeScript, Node and package manager versions.
2. Existing route/component structure.
3. Existing project and service content sources.
4. Current public page data flow and caching strategy.
5. Existing authentication, middleware and API conventions.
6. Existing database/Prisma setup.
7. Existing image/video storage and asset references.
8. Current deployment assumptions and environment variable names without exposing values.
9. Existing tests, lint and type-check scripts.
10. Current git status and uncommitted work.

Produce:
- Current architecture summary.
- Exact proposed files/folders adapted to this repository.
- Dependencies to add, with reasons.
- Database migration risks.
- Security concerns.
- Public UI regression risks.
- Phase-by-phase implementation plan.

Do not edit files in this phase. Do not create scaffolding. Do not guess missing information. Stop and report findings for approval.
```

## 25. Phase 1 --- Database foundation prompt

``` text
Implement only Phase 1 from AGENTS.md: database and backend foundation.

Before editing, confirm Phase 0 findings and approved plan.

- Add Prisma compatible with the repository.
- Implement AdminUser, AdminSession, ServiceCategory, Project, MediaAsset, ProjectMedia, ProjectHighlight, Service, SiteSetting, HomepageFeaturedProject and ActivityLog.
- Validate all inverse relations, indexes, foreign keys and delete behavior.
- Add the four category seed records.
- Add a safe Prisma singleton.
- Keep database modules server-only.
- Validate environment variables without printing secrets.
- Add repository/service functions for basic project and category reads.
- Create reviewed migrations and document commands.

Do not build dashboard UI.
Do not implement authentication yet.
Do not implement Cloudinary upload yet.
Do not replace public hardcoded content.
Do not run destructive resets.
Do not run production migrations.

Run schema validation, client generation, development migration/seed verification, type-check and relevant tests. Report exact results and stop for approval.
```

## 26. Phase 2 --- Authentication prompt

``` text
Implement only Phase 2 from AGENTS.md: secure single-owner authentication.

- No public signup.
- Secure one-time owner bootstrap.
- Strong password hashing.
- Secure server-managed sessions.
- Prefer opaque random tokens stored hashed or a vetted compatible session library.
- HttpOnly, Secure-in-production and appropriate SameSite cookies.
- Rotate on login, revoke on logout, enforce expiry and active account status.
- Rate-limit login.
- Generic invalid credentials response.
- CSRF/origin protection for cookie-authenticated mutations.
- Reusable server-side requireAdmin helper.
- Audit login success/failure/logout without sensitive values.

Endpoints:
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/auth/session

Test valid/invalid login, throttling, session expiry, logout, inactive admin and unauthenticated access. Do not expose hashes or secrets. Do not build the full dashboard. Stop for approval.
```

## 27. Phase 3 --- Admin UI prompt

``` text
Implement only Phase 3 from AGENTS.md: protected admin shell and project UI.

Create /admin/login, /admin, /admin/projects, /admin/projects/new and /admin/projects/[id]/edit.

Build a professional responsive light dashboard:
- Sidebar and mobile navigation.
- Header with admin identity and logout.
- Dashboard metrics and recent activity.
- Project list with search, category/status filters, pagination and actions.
- Project form with title, slug, category, location, short/full description, optional completion date, highlights, featured flag and SEO fields.
- Save draft.
- Loading, empty, error and success states.
- Confirmation for archive and other destructive actions.

Use existing design tokens and UI dependencies. Do not redesign public website. Use server-validated forms. Add upload placeholders only; Cloudinary comes in Phase 4. Test desktop/mobile and form validation. Stop for approval.
```

## 28. Phase 4 --- Cloudinary prompt

``` text
Implement only Phase 4 from AGENTS.md: secure Cloudinary media management.

- Server-only Cloudinary client.
- Authenticated signed upload authorization.
- Restrict formats, resource types, generated folders and file sizes.
- Browser direct upload to Cloudinary.
- Progress, retry and limited concurrency.
- Server-side confirmation verifies asset through Cloudinary.
- Persist verified MediaAsset metadata.
- Media library search, filters, preview, alt text and captions.
- Safe deletion only for unused assets.
- Idempotent retry/confirmation.

Never trust browser metadata or expose CLOUDINARY_API_SECRET. Do not accept arbitrary public IDs/folders. Initial configurable limits: image 15 MB and video 100 MB, subject to provider plan. Test invalid/oversized files, failed uploads, retry, duplicates and linked-media deletion. Stop for approval.
```

## 29. Phase 5 --- Project publishing prompt

``` text
Implement only Phase 5 from AGENTS.md: project media and publishing workflow.

Integrate media picker into project forms:
- One cover image.
- Multiple gallery photos.
- Multiple videos.
- Media role and ordering.
- Alt text and captions.
- Preview.
- Save draft.
- Publish.
- Unpublish to draft.
- Archive.

Server validates all required fields and media references. Ensure one cover per project with transactional replacement. Verify media exists in the database and Cloudinary before linking. Write audit events. Never hard-delete projects by default.

Test draft/public exclusion and complete lifecycle. Stop for approval.
```

## 30. Phase 6 --- Public website integration prompt

``` text
Implement only Phase 6 from AGENTS.md: connect the current public website to CMS data.

Public endpoints:
GET /api/v1/public/homepage
GET /api/v1/public/projects
GET /api/v1/public/projects/:slug
GET /api/v1/public/services
GET /api/v1/public/services/:slug
GET /api/v1/public/settings

Preserve current public visual design, layout, spacing, fonts, colors, animations, navbar and interactions.

Replace hardcoded project data gradually using typed server-side data access. Only published projects and active services are public. Use stable slugs, featured ordering, category filters, SEO/Open Graph metadata, loading/empty/error states and cache revalidation.

Do not invent content or replace authentic photos. Test all affected routes, draft exclusion, mobile/tablet/desktop and visual parity. Stop for approval.
```

## 31. Phase 7 --- Services and settings prompt

``` text
Implement only Phase 7 from AGENTS.md.

Add CMS management for:
- Four service categories and their service details.
- Service descriptions, specialties, active status and ordering.
- Featured homepage projects and their order.
- Only explicitly approved hero/trust copy fields.
- Real business contact and WhatsApp settings when supplied.
- SEO defaults.

Use Zod validation, settings allowlists, confirmation/preview, audit logs and cache revalidation. Prevent deletion of categories referenced by projects. Do not build a free-form page builder or permit arbitrary script/layout/theme changes. Test public rendering. Stop for approval.
```

## 32. Phase 8 --- Production hardening prompt

``` text
Implement only Phase 8 from AGENTS.md: production hardening.

Audit authentication, sessions, authorization, CSRF, rate limits, validation, Cloudinary verification, media deletion, public data exposure, migrations, indexes, caching, logging, accessibility, responsive behavior and backups.

Add unit, integration and E2E tests for:
- Auth/session.
- Project lifecycle.
- Draft exclusion.
- Media verification and safe deletion.
- Featured order.
- Public listing/detail.
- Cache revalidation.

Run lint, type-check, tests and production build. Document local setup, environment variables, owner bootstrap, migration, Cloudinary setup, deployment, backup/restore and troubleshooting.

Do not deploy or alter production data without approval. Report actual results, risks and prerequisites. Stop for approval.
```

------------------------------------------------------------------------

# PART J --- DEFINITION OF DONE

## 33. A phase is complete only when

-   Implementation matches the approved phase scope.
-   Code follows the repository conventions.
-   No unrelated changes were made.
-   TypeScript has no new errors.
-   Relevant lint/tests pass, or failures are explicitly documented.
-   Relevant production build succeeds, or the blocker is documented.
-   No secrets or private data are exposed.
-   Admin APIs enforce server-side authorization.
-   Public APIs return only approved public content.
-   UI has loading, empty, error and success states.
-   Desktop and mobile behavior are checked for UI phases.
-   Accessibility basics are implemented.
-   Documentation is updated where needed.
-   The agent reports exact changes and waits for approval.

## 34. Final production acceptance criteria

The CMS is ready for production only when:

1.  The owner can securely sign in and sign out.
2.  Unauthenticated users cannot access admin pages or admin APIs.
3.  The owner can create and edit projects.
4.  The owner can upload and manage real project photos/videos.
5.  Upload metadata is verified server-side with Cloudinary.
6.  The owner can preview and publish a project.
7.  Published projects appear on the correct public pages.
8.  Draft and archived projects are never publicly accessible.
9.  The owner can manage service content and featured projects.
10. Existing public website design and behavior are preserved.
11. SEO metadata and project URLs work.
12. Database backup and restore are documented and tested.
13. Security, integration and E2E tests cover critical flows.
14. Production deployment has been explicitly approved.

------------------------------------------------------------------------

# PART K --- COMMUNICATION STANDARD

## 35. How to communicate progress

Be concise, factual and technically specific.

At the beginning of a phase, state: - Phase number and objective. - What
will be inspected. - Planned files/modules. - Risks and dependencies.

At completion, state: - What was implemented. - Files changed. -
API/schema changes. - Commands actually run and their results. - Tests
not run and why. - Known limitations. - Next recommended phase.

Do not: - Say "everything is done" when only UI is complete. - Claim
production readiness without security and operational verification. -
Hide failed tests. - Invent test results. - Proceed into the next phase
without approval. - Ask the user to repeat information already in this
file.

**Final instruction:** Treat this file as the engineering contract for
MAMA INTERIOR CMS. When a user request conflicts with these standards,
explain the conflict and ask for approval before changing architecture,
security controls, public design or production behavior.
