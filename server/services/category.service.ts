import "server-only";
import { findAllCategories, findCategoryBySlug } from "../repositories/category.repository";

export async function getActiveCategories() {
  return findAllCategories({ includeInactive: false });
}

export async function getAllCategoriesForAdmin() {
  return findAllCategories({ includeInactive: true });
}

export async function getCategoryDetails(slug: string) {
  return findCategoryBySlug(slug);
}

