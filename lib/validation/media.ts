import { z } from "zod";

export const requestSignatureSchema = z.object({
  resourceType: z.enum(["image", "video"]).default("image"),
  projectId: z.string().uuid().optional(),
  folderSuffix: z.string().max(50).optional(),
});

export type RequestSignatureInput = z.infer<typeof requestSignatureSchema>;

export const confirmUploadSchema = z.object({
  publicId: z
    .string()
    .min(1, "Cloudinary public ID is required")
    .max(255)
    .regex(/^[a-zA-Z0-9_\-/\.]+$/, "Invalid public ID format"),
  resourceType: z.enum(["image", "video"]).default("image"),
  originalName: z.string().max(255).optional(),
  altText: z.string().max(255).optional(),
  caption: z.string().max(500).optional(),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const updateMediaMetadataSchema = z.object({
  altText: z.string().max(255).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
});

export type UpdateMediaMetadataInput = z.infer<typeof updateMediaMetadataSchema>;

export const listMediaQuerySchema = z.object({
  q: z.string().optional(),
  type: z.enum(["ALL", "IMAGE", "VIDEO"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListMediaQueryInput = z.infer<typeof listMediaQuerySchema>;

