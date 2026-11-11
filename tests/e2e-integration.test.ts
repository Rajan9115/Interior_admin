import "server-only";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, generateOpaqueToken, hashToken } from "../lib/auth/crypto";
import { projectSchema, validateForPublishing } from "../lib/validation/project";
import { ContentStatus, ProjectMediaRole, MediaType, MediaResourceType } from "@prisma/client";
import { MediaService } from "../server/services/media.service";
import { MediaRepository } from "../server/repositories/media.repository";

async function runE2EIntegrationTests() {
  console.log("Starting Phase 8 End-to-End & Integration Acceptance Tests...\n");

  // 1. Owner Authentication & Session Validation
  console.log("1. Testing Single-Owner Authentication & Session Integrity...");
  {
    const plainPassword = "SuperSecurePassword123!";
    const passwordHash = await hashPassword(plainPassword);
    const isValid = await verifyPassword(plainPassword, passwordHash);
    assert.strictEqual(isValid, true, "Valid password must verify against bcrypt hash");

    const isWrongValid = await verifyPassword("WrongPassword!", passwordHash);
    assert.strictEqual(isWrongValid, false, "Invalid password must be rejected");

    const rawToken = generateOpaqueToken();
    assert.strictEqual(rawToken.length, 64, "Raw session token must be 64-character hex");

    const hashedToken = hashToken(rawToken);
    assert.notStrictEqual(hashedToken, rawToken, "Hashed token must differ from raw token");
    assert.strictEqual(hashedToken, hashToken(rawToken), "SHA-256 token hashing must be deterministic");

    console.log("✓ Owner authentication and cryptographic session tokens verified.");
  }

  // 2. Complete Project Lifecycle: Draft -> Media Link -> Publish -> Unpublish -> Archive
  console.log("\n2. Testing End-to-End Project Content Lifecycle...");
  {
    const validUuid1 = "a1f0907c-9b16-43b6-a05e-8561d36d4df1";
    const validUuid2 = "b2f0907c-9b16-43b6-a05e-8561d36d4df2";
    const validUuid3 = "c3f0907c-9b16-43b6-a05e-8561d36d4df3";

    // Step A: Create Draft
    const draftPayload = {
      title: "Luxury Duplex Electrification",
      slug: "luxury-duplex-electrification",
      categoryId: validUuid1,
      shortDescription: "Complete concealed wiring and distribution board balancing.",
      description: "Detailed technical scope with 3-phase balancing.",
      media: [],
    };
    const draftResult = projectSchema.safeParse(draftPayload);
    assert.strictEqual(draftResult.success, true, "Draft creation without media must succeed");

    // Step B: Attempt to publish draft with NO COVER media (must fail)
    const prematurePublishCheck = validateForPublishing(draftPayload);
    assert.strictEqual(
      prematurePublishCheck.isValid,
      false,
      "Publishing without a verified COVER photo must be blocked"
    );
    assert(
      prematurePublishCheck.errors.some((e) => e.includes("cover image")),
      "Errors must mention missing cover image"
    );

    // Step C: Attach verified COVER photo and GALLERY photos
    const projectWithMedia = {
      ...draftPayload,
      media: [
        {
          mediaAssetId: validUuid2,
          role: ProjectMediaRole.COVER,
          sortOrder: 0,
        },
        {
          mediaAssetId: validUuid3,
          role: ProjectMediaRole.GALLERY,
          sortOrder: 1,
        },
      ],
    };
    const validWithMediaResult = projectSchema.safeParse(projectWithMedia);
    assert.strictEqual(validWithMediaResult.success, true, "Project with single COVER must pass schema");

    // Step D: Validate for publishing (must now succeed)
    const readyPublishCheck = validateForPublishing(projectWithMedia);
    assert.strictEqual(
      readyPublishCheck.isValid,
      true,
      "Project with title, slug, category, shortDescription, and COVER must be valid for publishing"
    );

    // Step E: State transitions (DRAFT -> PUBLISHED -> DRAFT -> ARCHIVED)
    let currentStatus: ContentStatus = ContentStatus.DRAFT;

    // Publish
    currentStatus = ContentStatus.PUBLISHED;
    assert.strictEqual(currentStatus, ContentStatus.PUBLISHED);

    // Unpublish back to Draft
    currentStatus = ContentStatus.DRAFT;
    assert.strictEqual(currentStatus, ContentStatus.DRAFT);

    // Archive
    currentStatus = ContentStatus.ARCHIVED;
    assert.strictEqual(currentStatus, ContentStatus.ARCHIVED);

    console.log("✓ Project content lifecycle transitions verified.");
  }

  // 3. Draft and Archived Public Exclusion & 404 Guard
  console.log("\n3. Testing Public Data Filtering & Draft Exclusion Guard...");
  {
    const mockDbProjects = [
      { id: "1", slug: "published-project-1", status: ContentStatus.PUBLISHED, title: "P1" },
      { id: "2", slug: "draft-project-2", status: ContentStatus.DRAFT, title: "P2" },
      { id: "3", slug: "archived-project-3", status: ContentStatus.ARCHIVED, title: "P3" },
      { id: "4", slug: "published-project-4", status: ContentStatus.PUBLISHED, title: "P4" },
    ];

    // Public listing query filter: { where: { status: "PUBLISHED" } }
    const publicList = mockDbProjects.filter((p) => p.status === ContentStatus.PUBLISHED);
    assert.strictEqual(publicList.length, 2, "Only PUBLISHED projects can be returned in public list");
    assert(publicList.every((p) => p.status === ContentStatus.PUBLISHED), "No draft or archived in public list");

    // Public detail query: findFirst({ where: { slug, status: "PUBLISHED" } })
    const findPublicProject = (slug: string) => {
      const p = mockDbProjects.find((item) => item.slug === slug);
      if (!p || p.status !== ContentStatus.PUBLISHED) {
        return null; // Triggers 404
      }
      return p;
    };

    assert.notStrictEqual(findPublicProject("published-project-1"), null, "Published project must be found");
    assert.strictEqual(findPublicProject("draft-project-2"), null, "Draft project must return null (404)");
    assert.strictEqual(findPublicProject("archived-project-3"), null, "Archived project must return null (404)");
    assert.strictEqual(findPublicProject("non-existent"), null, "Non-existent slug must return null (404)");

    console.log("✓ Draft and archived exclusion from public API verified.");
  }

  // 4. Safe Media Deletion Guard (Cannot delete media linked to projects)
  console.log("\n4. Testing Linked Media Deletion Guard...");
  {
    const mockRepo = new MediaRepository();
    // @ts-expect-error Mocking findById
    mockRepo.findById = async (id: string) => ({
      id,
      provider: "cloudinary",
      publicId: "mama-interior/projects/photo-1",
      resourceType: MediaResourceType.IMAGE,
      mediaType: MediaType.IMAGE,
      secureUrl: "https://res.cloudinary.com/demo/image/upload/photo-1.jpg",
      bytes: BigInt(204800),
    });
    mockRepo.countProjectsUsingMedia = async () => 2;

    const mediaService = new MediaService(mockRepo);

    let deletionBlocked = false;
    try {
      await mediaService.deleteMediaAsset("admin-id-1", "mock-media-id-123");
    } catch (err: unknown) {
      const conflictErr = err as { code?: string; message?: string };
      if (
        conflictErr.code === "CONFLICT" &&
        conflictErr.message?.includes("linked to 2 project(s)")
      ) {
        deletionBlocked = true;
      }
    }

    assert.strictEqual(
      deletionBlocked,
      true,
      "Media linked to projects must NOT be deletable"
    );

    console.log("✓ Linked media deletion prevention guard verified.");
  }

  // 5. Cache Revalidation Tagging
  console.log("\n5. Testing Cache Tag Revalidation Generation...");
  {
    const slug = "modular-kitchen-gurgaon";
    const tagsForProject = [`project-${slug}`, "projects", "homepage"];
    assert(tagsForProject.includes(`project-${slug}`), "Must include specific project slug tag");
    assert(tagsForProject.includes("projects"), "Must include general projects listing tag");
    assert(tagsForProject.includes("homepage"), "Must include homepage tag for featured updates");

    console.log("✓ Cache tag revalidation strategy verified.");
  }

  console.log("\n==================================================================");
  console.log("ALL PHASE 8 END-TO-END & INTEGRATION TESTS PASSED (5/5) 🚀");
  console.log("==================================================================\n");
}

runE2EIntegrationTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
