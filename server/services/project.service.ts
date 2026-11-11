import "server-only";
import {
  findPublishedProjects,
  findPublishedProjectBySlug,
  findAdminProjects,
  AdminProjectsFilter,
  PublicProjectsFilter,
} from "../repositories/project.repository";

export async function getPublicProjects(filter: PublicProjectsFilter = {}) {
  return findPublishedProjects(filter);
}

export async function getPublicProjectBySlug(slug: string) {
  if (!slug || typeof slug !== "string") {
    return null;
  }
  return findPublishedProjectBySlug(slug.trim().toLowerCase());
}

export async function getAdminProjectsList(filter: AdminProjectsFilter = {}) {
  return findAdminProjects(filter);
}

