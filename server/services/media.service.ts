import "server-only";
import { mediaRepository, MediaRepository } from "../repositories/media.repository";
import {
  generateSignedUploadParams,
  verifyCloudinaryAsset,
  deleteCloudinaryAsset,
  MEDIA_LIMITS,
  SignedUploadParams,
} from "@/lib/cloudinary/client";
import {
  ConfirmUploadInput,
  RequestSignatureInput,
  UpdateMediaMetadataInput,
  ListMediaQueryInput,
} from "@/lib/validation/media";
import { logActivity } from "../audit/audit.service";
import { serializeBigInt } from "@/lib/db/prisma";

export class MediaService {
  constructor(private readonly repo: MediaRepository = mediaRepository) {}

  generateSignature(
    adminUserId: string,
    input: RequestSignatureInput
  ): SignedUploadParams {
    const folderSuffix = input.projectId
      ? `projects/${input.projectId}`
      : input.folderSuffix || "library";

    return generateSignedUploadParams({
      folderSuffix,
      resourceType: input.resourceType,
    });
  }

  async confirmUpload(adminUserId: string, input: ConfirmUploadInput) {
    // 1. Check idempotency: if already confirmed and saved, return existing
    const existing = await this.repo.findByPublicId(input.publicId);
    if (existing) {
      return serializeBigInt(existing);
    }

    // 2. Authoritatively verify asset metadata with Cloudinary
    const verified = await verifyCloudinaryAsset(
      input.publicId,
      input.resourceType
    );

    // 3. Enforce file size limits against verified Cloudinary bytes
    if (
      verified.resourceType === "IMAGE" &&
      verified.bytes > BigInt(MEDIA_LIMITS.IMAGE_MAX_BYTES)
    ) {
      throw new Error(
        `Image file size exceeds maximum allowed limit of 15 MB (${Number(
          verified.bytes / BigInt(1024 * 1024)
        )} MB)`
      );
    }

    if (
      verified.resourceType === "VIDEO" &&
      verified.bytes > BigInt(MEDIA_LIMITS.VIDEO_MAX_BYTES)
    ) {
      throw new Error(
        `Video file size exceeds maximum allowed limit of 100 MB (${Number(
          verified.bytes / BigInt(1024 * 1024)
        )} MB)`
      );
    }

    // 4. Persist verified metadata
    const created = await this.repo.create({
      provider: "cloudinary",
      publicId: verified.publicId,
      assetId: verified.assetId,
      resourceType: verified.resourceType,
      mediaType: verified.mediaType,
      secureUrl: verified.secureUrl,
      format: verified.format,
      mimeType: verified.mimeType,
      bytes: verified.bytes,
      width: verified.width,
      height: verified.height,
      durationSeconds: verified.durationSeconds,
      folder: verified.folder,
      originalName: input.originalName || null,
      altText: input.altText || null,
      caption: input.caption || null,
    });

    // 5. Audit log
    await logActivity({
      adminUserId,
      action: "MEDIA_UPLOADED",
      entityType: "MediaAsset",
      entityId: created.id,
      summary: `Uploaded and verified ${verified.resourceType.toLowerCase()} asset: ${created.publicId}`,
      metadata: {
        publicId: created.publicId,
        resourceType: created.resourceType,
        bytes: Number(created.bytes),
        secureUrl: created.secureUrl,
      },
    });

    return serializeBigInt(created);
  }

  async listMedia(query: ListMediaQueryInput) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const { items, total } = await this.repo.list({
      q: query.q,
      type: query.type,
      skip,
      take: pageSize,
    });

    return {
      items: serializeBigInt(items),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getMediaById(id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new Error("Media asset not found");
    }
    return serializeBigInt(asset);
  }

  async updateMediaMetadata(
    adminUserId: string,
    id: string,
    input: UpdateMediaMetadataInput
  ) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new Error("Media asset not found");
    }

    const updated = await this.repo.update(id, {
      altText: input.altText !== undefined ? input.altText : asset.altText,
      caption: input.caption !== undefined ? input.caption : asset.caption,
    });

    return serializeBigInt(updated);
  }

  async deleteMediaAsset(adminUserId: string, id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      throw new Error("Media asset not found");
    }

    // Strict safety check: block deletion if linked to ANY project
    const usageCount = await this.repo.countProjectsUsingMedia(id);
    if (usageCount > 0) {
      const error = new Error(
        `Cannot delete media asset because it is currently linked to ${usageCount} project(s). Unlink it from all projects before deleting.`
      );
      (error as unknown as { code: string }).code = "CONFLICT";
      throw error;
    }

    // 1. Delete from Cloudinary CDN storage
    await deleteCloudinaryAsset(
      asset.publicId,
      asset.resourceType.toLowerCase() as "image" | "video"
    );

    // 2. Delete database record
    await this.repo.delete(id);

    // 3. Audit log
    await logActivity({
      adminUserId,
      action: "MEDIA_DELETED",
      entityType: "MediaAsset",
      entityId: id,
      summary: `Deleted media asset: ${asset.publicId}`,
      metadata: {
        publicId: asset.publicId,
        resourceType: asset.resourceType,
      },
    });

    return { success: true, deletedId: id };
  }
}

export const mediaService = new MediaService();
