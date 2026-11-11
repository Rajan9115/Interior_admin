import { z } from "zod";

export const projectSchema = z.object({
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
});

export type ProjectInput = z.infer<typeof projectSchema>;

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

