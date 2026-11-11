import "server-only";
import { ServiceRepository, CategoryWithServices } from "../repositories/service.repository";
import { CreateServiceInput, UpdateServiceInput, UpdateCategoryInput } from "@/lib/validation/service";
import { logActivity } from "../audit/audit.service";
import { ActivityAction, Service, ServiceCategory } from "@prisma/client";

export class ServiceService {
  /**
   * Returns all categories with their services.
   */
  static async getCategoriesWithServices(includeInactive = true): Promise<CategoryWithServices[]> {
    return ServiceRepository.findAllCategoriesWithServices(includeInactive);
  }

  /**
   * Updates category details.
   */
  static async updateCategory(
    id: string,
    input: UpdateCategoryInput,
    adminUserId: string
  ): Promise<ServiceCategory> {
    const existing = await ServiceRepository.findCategoryById(id);
    if (!existing) {
      throw new Error("Category not found.");
    }

    const updated = await ServiceRepository.updateCategory(id, input);

    await logActivity({
      adminUserId,
      action: ActivityAction.SERVICE_UPDATED,
      entityType: "ServiceCategory",
      entityId: id,
      summary: `Updated service category "${updated.name}"`,
      metadata: { input },
    });

    return updated;
  }

  /**
   * Creates a service.
   */
  static async createService(input: CreateServiceInput, adminUserId: string): Promise<Service> {
    const existingSlug = await ServiceRepository.findServiceBySlug(input.slug);
    if (existingSlug) {
      throw new Error(`A service with slug "${input.slug}" already exists.`);
    }

    const category = await ServiceRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new Error("Target category not found.");
    }

    const service = await ServiceRepository.createService(input);

    await logActivity({
      adminUserId,
      action: ActivityAction.SERVICE_UPDATED,
      entityType: "Service",
      entityId: service.id,
      summary: `Created new service "${service.title}" under ${category.name}`,
      metadata: { serviceId: service.id, title: service.title, slug: service.slug },
    });

    return service;
  }

  /**
   * Updates a service.
   */
  static async updateService(
    id: string,
    input: UpdateServiceInput,
    adminUserId: string
  ): Promise<Service> {
    const existing = await ServiceRepository.findServiceById(id);
    if (!existing) {
      throw new Error("Service not found.");
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugCheck = await ServiceRepository.findServiceBySlug(input.slug);
      if (slugCheck && slugCheck.id !== id) {
        throw new Error(`Slug "${input.slug}" is already in use by another service.`);
      }
    }

    const updated = await ServiceRepository.updateService(id, input);

    await logActivity({
      adminUserId,
      action: ActivityAction.SERVICE_UPDATED,
      entityType: "Service",
      entityId: updated.id,
      summary: `Updated service "${updated.title}"`,
      metadata: { changes: input },
    });

    return updated;
  }

  /**
   * Deletes a service.
   */
  static async deleteService(id: string, adminUserId: string): Promise<Service> {
    const existing = await ServiceRepository.findServiceById(id);
    if (!existing) {
      throw new Error("Service not found.");
    }

    const deleted = await ServiceRepository.deleteService(id);

    await logActivity({
      adminUserId,
      action: ActivityAction.SERVICE_UPDATED,
      entityType: "Service",
      entityId: deleted.id,
      summary: `Deleted service "${deleted.title}"`,
      metadata: { title: deleted.title, slug: deleted.slug },
    });

    return deleted;
  }

  /**
   * Reorders services.
   */
  static async reorderServices(
    items: Array<{ id: string; sortOrder: number }>,
    adminUserId: string
  ): Promise<void> {
    await ServiceRepository.reorderServices(items);

    await logActivity({
      adminUserId,
      action: ActivityAction.SERVICE_UPDATED,
      entityType: "Service",
      summary: `Reordered ${items.length} services`,
      metadata: { count: items.length },
    });
  }
}

