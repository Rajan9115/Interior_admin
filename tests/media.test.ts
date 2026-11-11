import "server-only";
import assert from "node:assert/strict";
import {
  generateSignedUploadParams,
  verifyCloudinaryAsset,
  MEDIA_LIMITS,
} from "../lib/cloudinary/client";
import {
  requestSignatureSchema,
  confirmUploadSchema,
  updateMediaMetadataSchema,
  listMediaQuerySchema,
} from "../lib/validation/media";
import { MediaService } from "../server/services/media.service";
import { MediaRepository } from "../server/repositories/media.repository";
import { Prisma } from "@prisma/client";

interface MockAssetRecord {
  id: string;
  provider: string;
  publicId: string;
  assetId?: string | null;
  resourceType: "IMAGE" | "VIDEO";
  mediaType: "IMAGE" | "VIDEO";
  secureUrl: string;
  format?: string | null;
  mimeType?: string | null;
  bytes: bigint;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  originalName?: string | null;
  altText?: string | null;
  caption?: string | null;
  folder?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Test mock repository to test service rules without live database dependency
class MockMediaRepository extends MediaRepository {
  private assets: Map<string, MockAssetRecord> = new Map();
  private projectUsageCounts: Map<string, number> = new Map();

  async findById(id: string) {
    const asset = this.assets.get(id);
    if (!asset) return null;
    return {
      ...asset,
      _count: { projectLinks: this.projectUsageCounts.get(id) || 0 },
    } as unknown as Awaited<ReturnType<MediaRepository["findById"]>>;
  }

  async findByPublicId(publicId: string) {
    for (const asset of this.assets.values()) {
      if (asset.publicId === publicId) {
        return {
          ...asset,
          _count: { projectLinks: this.projectUsageCounts.get(asset.id) || 0 },
        } as unknown as Awaited<ReturnType<MediaRepository["findByPublicId"]>>;
      }
    }
    return null;
  }

  async create(data: Prisma.MediaAssetCreateInput) {
    const id = `mock-id-${Date.now()}-${Math.random()}`;
    const newAsset: MockAssetRecord = {
      id,
      provider: data.provider || "cloudinary",
      publicId: data.publicId,
      assetId: data.assetId || null,
      resourceType: data.resourceType,
      mediaType: data.mediaType,
      secureUrl: data.secureUrl,
      format: data.format || null,
      mimeType: data.mimeType || null,
      bytes: typeof data.bytes === "bigint" ? data.bytes : BigInt(String(data.bytes)),
      width: data.width || null,
      height: data.height || null,
      durationSeconds: data.durationSeconds || null,
      originalName: data.originalName || null,
      altText: data.altText || null,
      caption: data.caption || null,
      folder: data.folder || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.set(id, newAsset);
    return {
      ...newAsset,
      _count: { projectLinks: 0 },
    } as unknown as Awaited<ReturnType<MediaRepository["create"]>>;
  }

  async update(id: string, data: Prisma.MediaAssetUpdateInput) {
    const asset = this.assets.get(id);
    if (!asset) throw new Error("Not found");
    const updated: MockAssetRecord = {
      ...asset,
      altText: (data.altText as string) ?? asset.altText,
      caption: (data.caption as string) ?? asset.caption,
      updatedAt: new Date(),
    };
    this.assets.set(id, updated);
    return {
      ...updated,
      _count: { projectLinks: this.projectUsageCounts.get(id) || 0 },
    } as unknown as Awaited<ReturnType<MediaRepository["update"]>>;
  }

  async delete(id: string) {
    const asset = this.assets.get(id);
    if (!asset) throw new Error("Asset not found");
    this.assets.delete(id);
    return asset as unknown as Awaited<ReturnType<MediaRepository["delete"]>>;
  }

  async countProjectsUsingMedia(id: string): Promise<number> {
    return this.projectUsageCounts.get(id) || 0;
  }

  // Test helper to link asset to projects
  setProjectUsage(id: string, count: number) {
    this.projectUsageCounts.set(id, count);
  }
}

async function runMediaSecurityTests() {
  console.log("Starting Phase 4 Cloudinary Media Security & Business Logic Unit Tests...\n");

  // 1. Test Signed Upload Parameter Generation and Folder Sanitization
  console.log("1. Testing Signed Upload Parameters & Server Folder Controls...");
  {
    const imgParams = generateSignedUploadParams({
      folderSuffix: "projects/living-room-01",
      resourceType: "image",
    });

    assert.ok(imgParams.signature, "Signature must be generated");
    assert.strictEqual(imgParams.resourceType, "image");
    assert.strictEqual(imgParams.folder, "mama-interior/projects/living-room-01");
    assert.strictEqual(imgParams.maxFileSize, 15 * 1024 * 1024);
    assert.deepStrictEqual(imgParams.allowedFormats, ["jpg", "jpeg", "png", "webp"]);

    // Test malicious path traversal sanitization
    const maliciousParams = generateSignedUploadParams({
      folderSuffix: "../../../etc/passwd/hack",
      resourceType: "video",
    });
    assert.ok(
      !maliciousParams.folder.includes(".."),
      "Folder must sanitize path traversal dots and slashes"
    );
    assert.strictEqual(maliciousParams.resourceType, "video");
    assert.strictEqual(maliciousParams.maxFileSize, 100 * 1024 * 1024);
    assert.deepStrictEqual(maliciousParams.allowedFormats, ["mp4", "mov"]);

    console.log("✓ Signed upload parameters & folder sanitization passed.");
  }

  // 2. Test File Size Limit Constants and Authoritative Verification
  console.log("\n2. Testing File Size Limits & Cloudinary Server-Side Verification...");
  {
    assert.strictEqual(MEDIA_LIMITS.IMAGE_MAX_BYTES, 15 * 1024 * 1024, "Image max must be 15MB");
    assert.strictEqual(MEDIA_LIMITS.VIDEO_MAX_BYTES, 100 * 1024 * 1024, "Video max must be 100MB");
    assert.strictEqual(MEDIA_LIMITS.MAX_CONCURRENT_UPLOADS, 3, "Max concurrent uploads must be 3");

    const verified = await verifyCloudinaryAsset("mama-interior/test-photo", "image");
    assert.strictEqual(verified.publicId, "mama-interior/test-photo");
    assert.strictEqual(verified.resourceType, "IMAGE");
    assert.strictEqual(verified.mediaType, "IMAGE");
    assert.strictEqual(typeof verified.bytes, "bigint");
    assert.ok(verified.secureUrl.startsWith("https://"));

    console.log("✓ File size limits & server verification passed.");
  }

  // 3. Test Service Idempotency (Duplicate Confirmations)
  console.log("\n3. Testing Idempotent Confirmation...");
  {
    const mockRepo = new MockMediaRepository();
    const service = new MediaService(mockRepo);
    const adminId = "mock-admin-uuid";

    // First confirmation
    const firstConfirm = await service.confirmUpload(adminId, {
      publicId: "mama-interior/projects/living-room-p1",
      resourceType: "image",
      originalName: "IMG_001.jpg",
      altText: "Modular living room TV unit woodwork",
    });

    assert.ok(firstConfirm.id, "Asset must be created with ID");
    assert.strictEqual(firstConfirm.publicId, "mama-interior/projects/living-room-p1");
    assert.strictEqual(firstConfirm.altText, "Modular living room TV unit woodwork");

    // Second confirmation with same publicId (e.g. network retry)
    const secondConfirm = await service.confirmUpload(adminId, {
      publicId: "mama-interior/projects/living-room-p1",
      resourceType: "image",
      originalName: "IMG_001.jpg",
    });

    assert.strictEqual(
      secondConfirm.id,
      firstConfirm.id,
      "Second confirmation must return existing asset ID (idempotency)"
    );

    console.log("✓ Idempotent confirmation passed.");
  }

  // 4. Test Safe Deletion Protection (Cannot delete media used in projects)
  console.log("\n4. Testing Safe Media Deletion Guard...");
  {
    const mockRepo = new MockMediaRepository();
    const service = new MediaService(mockRepo);
    const adminId = "mock-admin-uuid";

    // Create an asset
    const asset = await service.confirmUpload(adminId, {
      publicId: "mama-interior/kitchen-modular-01",
      resourceType: "image",
    });

    // Case A: Asset is linked to 2 projects -> Deletion MUST be blocked
    mockRepo.setProjectUsage(asset.id, 2);

    let deleteBlocked = false;
    try {
      await service.deleteMediaAsset(adminId, asset.id);
    } catch (err: unknown) {
      const conflictErr = err as { code?: string; message?: string };
      if (
        conflictErr.code === "CONFLICT" &&
        conflictErr.message?.includes("linked to 2 project(s)")
      ) {
        deleteBlocked = true;
      }
    }
    assert.ok(deleteBlocked, "Deletion must be rejected with CONFLICT when media is in use");

    // Case B: Asset is unlinked (0 projects) -> Deletion MUST succeed
    mockRepo.setProjectUsage(asset.id, 0);
    const deleteResult = await service.deleteMediaAsset(adminId, asset.id);
    assert.strictEqual(deleteResult.success, true);
    assert.strictEqual(deleteResult.deletedId, asset.id);

    console.log("✓ Safe media deletion guard passed.");
  }

  // 5. Test Zod Schemas Validation
  console.log("\n5. Testing Media Zod Schemas...");
  {
    // Signature schema
    assert.ok(
      requestSignatureSchema.safeParse({ resourceType: "image" }).success,
      "Valid signature request"
    );
    assert.ok(
      !requestSignatureSchema.safeParse({ resourceType: "audio" as unknown as "image" }).success,
      "Audio is rejected"
    );

    // Confirmation schema
    assert.ok(
      confirmUploadSchema.safeParse({
        publicId: "mama-interior/valid_id-123.jpg",
        resourceType: "image",
      }).success
    );
    assert.ok(
      !confirmUploadSchema.safeParse({
        publicId: "bad public id with spaces and <script>",
        resourceType: "image",
      }).success,
      "Invalid characters in public ID must be rejected"
    );

    // Metadata update schema
    assert.ok(
      updateMediaMetadataSchema.safeParse({
        altText: "New alt text",
        caption: "New caption",
      }).success
    );

    // List query schema
    const parsedQuery = listMediaQuerySchema.safeParse({
      type: "IMAGE",
      page: "2",
      pageSize: "30",
    });
    assert.ok(parsedQuery.success);
    if (parsedQuery.success) {
      assert.strictEqual(parsedQuery.data.page, 2);
      assert.strictEqual(parsedQuery.data.pageSize, 30);
    }

    console.log("✓ Media Zod schemas passed.");
  }

  console.log("\n==================================================");
  console.log("ALL PHASE 4 MEDIA SECURITY TESTS PASSED (5/5) 🚀");
  console.log("==================================================\n");
}

runMediaSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
