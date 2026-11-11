import "server-only";
import { HomepageRepository, FullFeaturedProject } from "../repositories/homepage.repository";
import { logActivity } from "../audit/audit.service";
import { ActivityAction } from "@prisma/client";

export class HomepageService {
  /**
   * Reads curated homepage featured projects.
   */
  static async getCuratedProjects(): Promise<FullFeaturedProject[]> {
    return HomepageRepository.getCuratedHomepageProjects();
  }

  /**
   * Reads eligible published projects that can be added to homepage curation.
   */
  static async getEligibleProjects() {
    return HomepageRepository.getEligiblePublishedProjects();
  }

  /**
   * Updates homepage curated projects list.
   */
  static async updateCuratedProjects(projectIds: string[], adminUserId: string): Promise<void> {
    await HomepageRepository.setCuratedHomepageProjects(projectIds);

    await logActivity({
      adminUserId,
      action: ActivityAction.PROJECT_UPDATED,
      entityType: "HomepageFeatured",
      summary: `Updated homepage featured curation with ${projectIds.length} projects`,
      metadata: { projectIds, count: projectIds.length },
    });
  }
}

