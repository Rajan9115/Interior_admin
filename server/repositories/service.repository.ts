import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Service, ServiceCategory } from "@prisma/client";
import { CreateServiceInput, UpdateServiceInput, CORE_TRADE_SLUGS } from "@/lib/validation/service";

export interface CategoryWithServices extends ServiceCategory {
  services: Service[];
  _count: {
    projects: number;
    services: number;
  };
}

export class ServiceRepository {
  /**
   * Fetches all service categories with nested services and counts.
   */
  static async findAllCategoriesWithServices(includeInactive = true): Promise<CategoryWithServices[]> {
    return prisma.serviceCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        services: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            projects: true,
            services: true,
          },
        },
      },
    });
  }

  /**
   * Finds a category by its ID.
   */
  static async findCategoryById(id: string): Promise<ServiceCategory | null> {
    return prisma.serviceCategory.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a category by its slug.
   */
  static async findCategoryBySlug(slug: string): Promise<ServiceCategory | null> {
    return prisma.serviceCategory.findUnique({
      where: { slug },
    });
  }

  /**
   * Updates category details.
   */
  static async updateCategory(
    id: string,
    data: { name?: string; description?: string | null; sortOrder?: number; isActive?: boolean }
  ): Promise<ServiceCategory> {
    return prisma.serviceCategory.update({
      where: { id },
      data,
    });
  }

  /**
   * Checks whether a category can safely be deleted.
   * Core trades ('electrical', 'carpentry', 'painting', 'ceiling') and
   * categories with attached projects CANNOT be deleted.
   */
  static async validateCategoryDeletion(id: string): Promise<{ canDelete: boolean; reason?: string }> {
    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true, services: true },
        },
      },
    });

    if (!category) {
      return { canDelete: false, reason: "Category does not exist." };
    }

    if (CORE_TRADE_SLUGS.includes(category.slug as (typeof CORE_TRADE_SLUGS)[number])) {
      return {
        canDelete: false,
        reason: `Core trade category "${category.name}" (${category.slug}) is architecturally protected and cannot be deleted.`,
      };
    }

    if (category._count.projects > 0) {
      return {
        canDelete: false,
        reason: `Category "${category.name}" is referenced by ${category._count.projects} project(s) and cannot be deleted.`,
      };
    }

    return { canDelete: true };
  }

  /**
   * Finds all services with optional category filter.
   */
  static async findAllServices(options?: {
    categoryId?: string;
    includeInactive?: boolean;
  }): Promise<(Service & { category: ServiceCategory })[]> {
    return prisma.service.findMany({
      where: {
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        category: true,
      },
    });
  }

  /**
   * Finds a service by ID.
   */
  static async findServiceById(id: string): Promise<(Service & { category: ServiceCategory }) | null> {
    return prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  /**
   * Finds a service by slug.
   */
  static async findServiceBySlug(slug: string): Promise<(Service & { category: ServiceCategory }) | null> {
    return prisma.service.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });
  }

  /**
   * Creates a new service.
   */
  static async createService(input: CreateServiceInput): Promise<Service> {
    return prisma.service.create({
      data: {
        categoryId: input.categoryId,
        title: input.title,
        slug: input.slug,
        shortDescription: input.shortDescription,
        description: input.description,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
      },
    });
  }

  /**
   * Updates an existing service.
   */
  static async updateService(id: string, input: UpdateServiceInput): Promise<Service> {
    return prisma.service.update({
      where: { id },
      data: {
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
        ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
      },
    });
  }

  /**
   * Deletes a service.
   */
  static async deleteService(id: string): Promise<Service> {
    return prisma.service.delete({
      where: { id },
    });
  }

  /**
   * Batch updates sort order for services.
   */
  static async reorderServices(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.service.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  }
}

