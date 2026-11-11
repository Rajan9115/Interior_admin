import "server-only";
import assert from "node:assert/strict";
import {
  createServiceSchema,
  reorderServicesSchema,
  CORE_TRADE_SLUGS,
} from "../lib/validation/service";
import { settingsAllowlistSchema } from "../lib/validation/settings";
import { updateHomepageFeaturedSchema } from "../lib/validation/homepage";
import { ServiceRepository } from "../server/repositories/service.repository";
import { prisma } from "../lib/db/prisma";

async function runServicesSettingsTests() {
  console.log("Starting Phase 7 Services, Homepage & Settings Unit Tests...\n");

  // 1. Core Trade Deletion & Modification Safeguards
  console.log("1. Testing Core Trade Deletion Protection...");
  {
    assert.deepStrictEqual(
      [...CORE_TRADE_SLUGS],
      ["electrical", "carpentry", "painting", "ceiling"],
      "Core trade slugs must be strictly electrical, carpentry, painting, and ceiling"
    );

    // Mock prisma check for category validation
    const originalFindUnique = prisma.serviceCategory.findUnique;
    try {
      // Test 1a: Core trade cannot be deleted
      // @ts-expect-error Mocking prisma method for testing
      prisma.serviceCategory.findUnique = async () => ({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Electrical",
        slug: "electrical",
        _count: { projects: 0, services: 0 },
      });

      const checkCore = await ServiceRepository.validateCategoryDeletion(
        "11111111-1111-1111-1111-111111111111"
      );
      assert.strictEqual(
        checkCore.canDelete,
        false,
        "Core trade category 'electrical' must NOT be deletable"
      );
      assert(
        checkCore.reason?.includes("architecturally protected"),
        "Reason must state architectural protection"
      );

      // Test 1b: Category with attached projects cannot be deleted
      // @ts-expect-error Mocking prisma method for testing
      prisma.serviceCategory.findUnique = async () => ({
        id: "22222222-2222-2222-2222-222222222222",
        name: "Custom Furniture",
        slug: "custom-furniture",
        _count: { projects: 4, services: 1 },
      });

      const checkWithProjects = await ServiceRepository.validateCategoryDeletion(
        "22222222-2222-2222-2222-222222222222"
      );
      assert.strictEqual(
        checkWithProjects.canDelete,
        false,
        "Category with linked projects must NOT be deletable"
      );
      assert(
        checkWithProjects.reason?.includes("referenced by 4 project(s)"),
        "Reason must reference attached projects"
      );
    } finally {
      prisma.serviceCategory.findUnique = originalFindUnique;
    }

    console.log("✓ Core trade category deletion safeguards verified.");
  }

  // 2. Service Creation & Reordering Validation
  console.log("\n2. Testing Service Validation & Reordering Schemas...");
  {
    // Valid service creation
    const valid = createServiceSchema.safeParse({
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      title: "Concealed House Wiring",
      slug: "concealed-house-wiring",
      shortDescription: "Complete concealed conduit & electrical distribution boards.",
      isActive: true,
      sortOrder: 0,
    });
    assert.strictEqual(valid.success, true, "Valid service payload must pass");

    // Invalid slug format (uppercase and spaces not allowed)
    const invalidSlug = createServiceSchema.safeParse({
      categoryId: "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
      title: "Concealed House Wiring",
      slug: "Concealed House Wiring!",
      shortDescription: "Distribution boards.",
    });
    assert.strictEqual(invalidSlug.success, false, "Invalid slug format must fail");

    // Reorder schema validation
    const validReorder = reorderServicesSchema.safeParse({
      items: [
        { id: "a1f0907c-9b16-43b6-a05e-8561d36d4df1", sortOrder: 0 },
        { id: "b2f0907c-9b16-43b6-a05e-8561d36d4df2", sortOrder: 1 },
      ],
    });
    assert.strictEqual(validReorder.success, true, "Valid reorder payload must pass");

    const emptyReorder = reorderServicesSchema.safeParse({ items: [] });
    assert.strictEqual(emptyReorder.success, false, "Empty reorder array must fail");

    console.log("✓ Service creation and reordering schemas verified.");
  }

  // 3. Settings Strict Allowlist Enforcement
  console.log("\n3. Testing Settings Strict Allowlist Enforcement...");
  {
    // Valid settings payload
    const validSettings = settingsAllowlistSchema.safeParse({
      business_name: "MAMA INTERIOR",
      phone: "+91 80818 70179",
      whatsapp: "+91 80818 70179",
      email: "contact@mamainterior.in",
      address: "Metro Area, India",
      service_areas: "Greater Metro & Surrounding Districts",
      hours: "Mon – Sat: 9:00 AM – 7:30 PM",
      gstin: "07AAAAA0000A1Z5",
    });
    assert.strictEqual(validSettings.success, true, "Valid contractor settings must pass");

    // Attempting to inject arbitrary unallowed keys MUST FAIL (.strict() enforcement)
    const injectionAttempt = settingsAllowlistSchema.safeParse({
      business_name: "MAMA INTERIOR",
      phone: "+91 80818 70179",
      whatsapp: "+91 80818 70179",
      email: "contact@mamainterior.in",
      arbitrary_key: "malicious_script_or_config",
      custom_html: "<script>alert(1)</script>",
      theme_override: "dark-mode-injected",
    });
    assert.strictEqual(
      injectionAttempt.success,
      false,
      "Arbitrary or unauthorized keys must be rejected by strict schema"
    );

    // Invalid phone pattern
    const invalidPhone = settingsAllowlistSchema.safeParse({
      phone: "not-a-phone-number",
    });
    assert.strictEqual(invalidPhone.success, false, "Malformed phone number must fail");

    console.log("✓ Strict settings allowlist & anti-injection guard verified.");
  }

  // 4. Homepage Curation Validation
  console.log("\n4. Testing Homepage Featured Curation...");
  {
    const validFeatured = updateHomepageFeaturedSchema.safeParse({
      projectIds: [
        "a1f0907c-9b16-43b6-a05e-8561d36d4df1",
        "b2f0907c-9b16-43b6-a05e-8561d36d4df2",
      ],
    });
    assert.strictEqual(validFeatured.success, true, "Valid project IDs array must pass");

    // Invalid UUID
    const invalidUUID = updateHomepageFeaturedSchema.safeParse({
      projectIds: ["not-a-uuid"],
    });
    assert.strictEqual(invalidUUID.success, false, "Invalid project UUID must fail");

    console.log("✓ Homepage curation schema verified.");
  }

  console.log("\n========================================================");
  console.log("ALL PHASE 7 SERVICES & SETTINGS TESTS PASSED (4/4) 🚀");
  console.log("========================================================\n");
}

runServicesSettingsTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});

