import { z } from "zod";

export const updateHomepageFeaturedSchema = z.object({
  projectIds: z
    .array(z.string().uuid("Invalid project ID"))
    .max(20, "Cannot feature more than 20 projects on homepage simultaneously"),
});

export type UpdateHomepageFeaturedInput = z.infer<typeof updateHomepageFeaturedSchema>;

