import { z } from "zod";
import { ProjectMediaRole } from "@prisma/client";

export const projectMediaItemSchema = z.object({
  mediaAssetId: z.string().uuid("Invalid media asset ID"),
  role: z.nativeEnum(ProjectMediaRole).default(ProjectMediaRole.GALLERY),
  sortOrder: z.number().int().default(0),
});

export type ProjectMediaItemInput = z.infer<typeof projectMediaItemSchema>;

export const projectSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title must not exceed 120 characters")
      .trim(),
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(140, "Slug must not exceed 140 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase letters, numbers, and single hyphens"
      )
      .trim(),
    categoryId: z.string().uuid("Please select a valid service category"),
    locationLabel: z.string().max(100).optional().nullable(),
    shortDescription: z
      .string()
      .min(10, "Short summary must be at least 10 characters")
      .max(300, "Short summary must not exceed 300 characters")
      .trim(),
    description: z.string().max(5000).optional().nullable(),
    completionDate: z.string().optional().nullable(),
    isFeatured: z.boolean().default(false),
    seoTitle: z.string().max(100).optional().nullable(),
    seoDescription: z.string().max(200).optional().nullable(),
    highlights: z.array(z.string().min(1)).optional().default([]),
    media: z.array(projectMediaItemSchema).optional().default([]),
  })
  .refine(
    (data) => {
      // Invariant: At most ONE media asset may have role === COVER
      if (!data.media || data.media.length === 0) return true;
      const coverCount = data.media.filter(
        (m) => m.role === ProjectMediaRole.COVER
      ).length;
      return coverCount <= 1;
    },
    {
      message: "A project can have at most one Cover image.",
      path: ["media"],
    }
  );

export type ProjectInput = z.infer<typeof projectSchema>;

/**
 * Validates whether a project satisfies all mandatory criteria to be published.
 */
export function validateForPublishing(project: {
  title?: string;
  slug?: string;
  categoryId?: string;
  shortDescription?: string;
  media?: { role: ProjectMediaRole; mediaAssetId: string }[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project.title || project.title.trim().length < 3) {
    errors.push("Title must be at least 3 characters long.");
  }

  if (!project.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    errors.push("Project must have a valid lowercase URL slug.");
  }

  if (!project.categoryId) {
    errors.push("Project must be assigned to a service category.");
  }

  if (!project.shortDescription || project.shortDescription.trim().length < 10) {
    errors.push("Short description must be at least 10 characters long.");
  }

  const covers = project.media?.filter((m) => m.role === ProjectMediaRole.COVER) || [];
  if (covers.length === 0) {
    errors.push("A cover image is required before publishing. Please designate one media item as Cover.");
  } else if (covers.length > 1) {
    errors.push("A project can have only one Cover image.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Converts a text title into an SEO-friendly URL slug.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}
