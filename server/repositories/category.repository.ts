import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ServiceCategory } from "@prisma/client";

export interface CategoryFilterOptions {
  includeInactive?: boolean;
}

export async function findAllCategories(
  options: CategoryFilterOptions = {}
): Promise<ServiceCategory[]> {
  return prisma.serviceCategory.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function findCategoryBySlug(
  slug: string
): Promise<ServiceCategory | null> {
  return prisma.serviceCategory.findUnique({
    where: { slug },
  });
}

export async function findCategoryById(
  id: string
): Promise<ServiceCategory | null> {
  return prisma.serviceCategory.findUnique({
    where: { id },
  });
}

