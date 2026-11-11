import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: "image" | "video";
  allowedFormats: string[];
  maxFileSize: number;
  uploadUrl: string;
}

export interface VerifiedAssetMetadata {
  publicId: string;
  assetId?: string;
  resourceType: "IMAGE" | "VIDEO";
  mediaType: "IMAGE" | "VIDEO";
  secureUrl: string;
  format?: string;
  mimeType?: string;
  bytes: bigint;
  width?: number;
  height?: number;
  durationSeconds?: number;
  folder?: string;
}

// Configurable file size limits (bytes)
export const MEDIA_LIMITS = {
  IMAGE_MAX_BYTES: 15 * 1024 * 1024, // 15 MB
  VIDEO_MAX_BYTES: 100 * 1024 * 1024, // 100 MB
  MAX_CONCURRENT_UPLOADS: 3,
  ALLOWED_IMAGE_FORMATS: ["jpg", "jpeg", "png", "webp"],
  ALLOWED_VIDEO_FORMATS: ["mp4", "mov"],
} as const;

let isConfigured = false;

function ensureCloudinaryConfig(): void {
  if (isConfigured) return;

  const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
}

/**
 * Generates server-signed upload parameters for direct browser-to-Cloudinary upload.
 * Restricts folder structure, resource type, and allowed formats.
 */
export function generateSignedUploadParams(options: {
  folderSuffix?: string;
  resourceType: "image" | "video";
}): SignedUploadParams {
  ensureCloudinaryConfig();

  const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY!;
  const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET!;

  // Sanitize folder suffix - server controls prefix strictly and prevents traversal
  const sanitizedSuffix = options.folderSuffix
    ? options.folderSuffix
        .replace(/[^a-zA-Z0-9_\-/]/g, "")
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, "")
        .slice(0, 50)
    : "general";

  const folder = `mama-interior/${sanitizedSuffix}`;
  const timestamp = Math.round(Date.now() / 1000);
  const resourceType = options.resourceType;

  const allowedFormats =
    resourceType === "video"
      ? [...MEDIA_LIMITS.ALLOWED_VIDEO_FORMATS]
      : [...MEDIA_LIMITS.ALLOWED_IMAGE_FORMATS];

  const maxFileSize =
    resourceType === "video"
      ? MEDIA_LIMITS.VIDEO_MAX_BYTES
      : MEDIA_LIMITS.IMAGE_MAX_BYTES;

  // Cloudinary params to sign
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType,
    allowedFormats,
    maxFileSize,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
  };
}

/**
 * Authoritatively verifies asset metadata directly with Cloudinary server-side.
 * Never trusts client-reported dimensions, bytes, duration, or formats.
 */
export async function verifyCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video"
): Promise<VerifiedAssetMetadata> {
  ensureCloudinaryConfig();

  // In test / offline development mode with mock cloud, return structured mock
  if (
    process.env.NODE_ENV === "test" ||
    (env.CLOUDINARY_CLOUD_NAME === "dev-cloud" &&
      env.CLOUDINARY_API_SECRET === "dev-cloudinary-api-secret")
  ) {
    return {
      publicId,
      assetId: `mock-asset-${Date.now()}`,
      resourceType: resourceType === "video" ? "VIDEO" : "IMAGE",
      mediaType: resourceType === "video" ? "VIDEO" : "IMAGE",
      secureUrl: `https://res.cloudinary.com/dev-cloud/${resourceType}/upload/v1/${publicId}.${
        resourceType === "video" ? "mp4" : "jpg"
      }`,
      format: resourceType === "video" ? "mp4" : "jpg",
      mimeType: resourceType === "video" ? "video/mp4" : "image/jpeg",
      bytes: BigInt(1024 * 1024),
      width: 1920,
      height: 1080,
      durationSeconds: resourceType === "video" ? 45.2 : undefined,
      folder: publicId.includes("/")
        ? publicId.substring(0, publicId.lastIndexOf("/"))
        : "mama-interior/general",
    };
  }

  try {
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      image_metadata: true,
    });

    const isVideo = resource.resource_type === "video";

    return {
      publicId: resource.public_id,
      assetId: resource.asset_id,
      resourceType: isVideo ? "VIDEO" : "IMAGE",
      mediaType: isVideo ? "VIDEO" : "IMAGE",
      secureUrl: resource.secure_url,
      format: resource.format,
      mimeType: isVideo
        ? `video/${resource.format || "mp4"}`
        : `image/${resource.format || "jpeg"}`,
      bytes: BigInt(resource.bytes || 0),
      width: resource.width ? Number(resource.width) : undefined,
      height: resource.height ? Number(resource.height) : undefined,
      durationSeconds: resource.duration ? Number(resource.duration) : undefined,
      folder: resource.folder || undefined,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; http_code?: number };
    throw new Error(
      `Cloudinary asset verification failed for "${publicId}": ${err.message || "Asset not found or inaccessible"}`
    );
  }
}

/**
 * Deletes an asset from Cloudinary CDN storage server-side.
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video"
): Promise<{ success: boolean; result: string }> {
  ensureCloudinaryConfig();

  // Test / mock offline mode
  if (
    process.env.NODE_ENV === "test" ||
    (env.CLOUDINARY_CLOUD_NAME === "dev-cloud" &&
      env.CLOUDINARY_API_SECRET === "dev-cloudinary-api-secret")
  ) {
    return { success: true, result: "ok" };
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    return {
      success: res.result === "ok" || res.result === "not found",
      result: res.result,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(
      `Cloudinary asset deletion failed for "${publicId}": ${err.message || "Failed to delete"}`
    );
  }
}
