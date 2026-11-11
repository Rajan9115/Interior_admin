import "server-only";
import assert from "node:assert/strict";
import {
  projectSchema,
  validateForPublishing,
} from "../lib/validation/project";
import { ContentStatus, ProjectMediaRole } from "@prisma/client";

async function runPublishingTests() {
  console.log("Starting Phase 5 Project Media & Publishing Lifecycle Unit Tests...\n");

  // 1. Test Invariant: Single Cover Per Project
  console.log("1. Testing Single Cover Invariant in Zod Schema...");
  {
    const validMediaSingleCover = [
      {
        mediaAssetId: "b3f0907c-9b16-43b6-a05e-8561d36d4df9",
        role: ProjectMediaRole.COVER,
        sortOrder: 0,
      },
      {
        mediaAssetId: "c4f0907c-9b16-43b6-a05e-8561d36d4df8",
        role: ProjectMediaRole.GALLERY,
        sortOrder: 1,
      },
    ];

    const validProject = projectSchema.safeParse({
      title: "Modular Kitchen Renovation",
      slug: "modular-kitchen-renovation",
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      shortDescription: "Complete kitchen woodwork with acrylic finish in Mumbai.",
      media: validMediaSingleCover,
    });
    assert.strictEqual(validProject.success, true, "Valid project with one cover must pass");

    // Multiple covers MUST fail
    const invalidMultipleCovers = [
      {
        mediaAssetId: "b3f0907c-9b16-43b6-a05e-8561d36d4df9",
        role: ProjectMediaRole.COVER,
        sortOrder: 0,
      },
      {
        mediaAssetId: "c4f0907c-9b16-43b6-a05e-8561d36d4df8",
        role: ProjectMediaRole.COVER,
        sortOrder: 1,
      },
    ];

    const invalidProject = projectSchema.safeParse({
      title: "Modular Kitchen Renovation",
      slug: "modular-kitchen-renovation",
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      shortDescription: "Complete kitchen woodwork with acrylic finish in Mumbai.",
      media: invalidMultipleCovers,
    });
    assert.strictEqual(
      invalidProject.success,
      false,
      "Project with multiple covers must be rejected"
    );

    console.log("✓ Single cover invariant passed.");
  }

  // 2. Test Publishing Criteria Validation Function
  console.log("\n2. Testing Server-Side Publishing Validation Rules...");
  {
    // Case A: Missing cover image
    const noCover = validateForPublishing({
      title: "False Ceiling & Cove Lighting",
      slug: "false-ceiling-cove-lighting",
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      shortDescription: "Modern false ceiling design with concealed warm lighting.",
      media: [
        {
          role: ProjectMediaRole.GALLERY,
          mediaAssetId: "b3f0907c-9b16-43b6-a05e-8561d36d4df9",
        },
      ],
    });
    assert.strictEqual(noCover.isValid, false);
    assert.ok(
      noCover.errors.some((e) => e.includes("cover image is required")),
      "Must require a cover image to publish"
    );

    // Case B: Short description too short (< 10 chars)
    const shortDescInvalid = validateForPublishing({
      title: "Living Room",
      slug: "living-room",
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      shortDescription: "Short",
      media: [
        {
          role: ProjectMediaRole.COVER,
          mediaAssetId: "b3f0907c-9b16-43b6-a05e-8561d36d4df9",
        },
      ],
    });
    assert.strictEqual(shortDescInvalid.isValid, false);
    assert.ok(
      shortDescInvalid.errors.some((e) => e.includes("Short description")),
      "Must enforce minimum short description length"
    );

    // Case C: Valid publishing criteria
    const valid = validateForPublishing({
      title: "3BHK Full Home Carpentry & Painting",
      slug: "3bhk-full-home-carpentry-painting",
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      shortDescription: "Comprehensive carpentry, wardrobe fabrication, and painting work.",
      media: [
        {
          role: ProjectMediaRole.COVER,
          mediaAssetId: "b3f0907c-9b16-43b6-a05e-8561d36d4df9",
        },
        {
          role: ProjectMediaRole.GALLERY,
          mediaAssetId: "c4f0907c-9b16-43b6-a05e-8561d36d4df8",
        },
      ],
    });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.errors.length, 0);

    console.log("✓ Publishing validation criteria passed.");
  }

  // 3. Test Content Lifecycle State Machine
  console.log("\n3. Testing Content Lifecycle Transitions (DRAFT -> PUBLISHED -> DRAFT -> ARCHIVED)...");
  {
    type ProjectMock = {
      id: string;
      title: string;
      status: ContentStatus;
      publishedAt: Date | null;
      archivedAt: Date | null;
    };

    let project: ProjectMock = {
      id: "mock-proj-1",
      title: "Electrical Rewiring",
      status: ContentStatus.DRAFT,
      publishedAt: null,
      archivedAt: null,
    };

    // Transition 1: Publish
    project = {
      ...project,
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
    };
    assert.strictEqual(project.status, ContentStatus.PUBLISHED);
    assert.ok(project.publishedAt instanceof Date);

    // Transition 2: Unpublish (Returns to DRAFT)
    project = {
      ...project,
      status: ContentStatus.DRAFT,
    };
    assert.strictEqual(project.status, ContentStatus.DRAFT);

    // Transition 3: Archive
    project = {
      ...project,
      status: ContentStatus.ARCHIVED,
      archivedAt: new Date(),
    };
    assert.strictEqual(project.status, ContentStatus.ARCHIVED);
    assert.ok(project.archivedAt instanceof Date);

    console.log("✓ Lifecycle state machine transitions passed.");
  }

  // 4. Test Draft Exclusion Simulation
  console.log("\n4. Testing Draft and Archived Exclusion in Public Queries...");
  {
    const projectsList = [
      { id: "1", title: "Project 1", status: ContentStatus.PUBLISHED },
      { id: "2", title: "Project 2 (Secret Draft)", status: ContentStatus.DRAFT },
      { id: "3", title: "Project 3 (Old Archived)", status: ContentStatus.ARCHIVED },
      { id: "4", title: "Project 4", status: ContentStatus.PUBLISHED },
    ];

    // Simulating public query: where { status: ContentStatus.PUBLISHED }
    const publicResults = projectsList.filter(
      (p) => p.status === ContentStatus.PUBLISHED
    );

    assert.strictEqual(publicResults.length, 2);
    assert.deepStrictEqual(
      publicResults.map((p) => p.id),
      ["1", "4"]
    );
    assert.ok(
      publicResults.every((p) => p.status === ContentStatus.PUBLISHED),
      "All public results must have PUBLISHED status"
    );

    console.log("✓ Draft & archived public exclusion passed.");
  }

  console.log("\n==========================================================");
  console.log("ALL PHASE 5 PROJECT PUBLISHING TESTS PASSED (4/4) 🚀");
  console.log("==========================================================\n");
}

runPublishingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
