import { z } from "zod";

export const CORE_TRADE_SLUGS = ["electrical", "carpentry", "painting", "ceiling"] as const;

export const createServiceSchema = z.object({
  categoryId: z.string().uuid("A valid category ID is required"),
  title: z
    .string()
    .trim()
    .min(2, "Service title must be at least 2 characters")
    .max(100, "Service title must not exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug must not exceed 100 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase alphanumeric characters and hyphens"),
  shortDescription: z
    .string()
    .trim()
    .min(5, "Short description must be at least 5 characters")
    .max(300, "Short description must not exceed 300 characters"),
  description: z.string().trim().max(3000, "Description must not exceed 3000 characters").optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0, "Sort order must be non-negative").default(0),
  seoTitle: z.string().trim().max(120, "SEO title must not exceed 120 characters").optional().nullable(),
  seoDescription: z.string().trim().max(300, "SEO description must not exceed 300 characters").optional().nullable(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const reorderServicesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid("Invalid service ID"),
      sortOrder: z.number().int().min(0, "Sort order must be non-negative"),
    })
  ).min(1, "At least one service must be specified for reordering"),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ReorderServicesInput = z.infer<typeof reorderServicesSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

