import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Project, ServiceCategory, ProjectMedia, MediaAsset, ProjectHighlight } from "@prisma/client";

export type FullFeaturedProject = Project & {
  category: ServiceCategory;
  media: (ProjectMedia & { mediaAsset: MediaAsset })[];
  highlights: ProjectHighlight[];
};

export class HomepageRepository {
  /**
   * Fetches curated homepage featured projects in their explicit sort order.
   * Only PUBLISHED projects are returned.
   */
  static async getCuratedHomepageProjects(): Promise<FullFeaturedProject[]> {
    const featuredEntries = await prisma.homepageFeaturedProject.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        project: {
          include: {
            category: true,
            media: {
              include: { mediaAsset: true },
              orderBy: { sortOrder: "asc" },
            },
            highlights: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    // Exclude any projects that are not PUBLISHED
    return featuredEntries
      .filter((entry) => entry.project.status === "PUBLISHED")
      .map((entry) => entry.project as FullFeaturedProject);
  }

  /**
   * Fetches published projects eligible to be featured on the homepage.
   */
  static async getEligiblePublishedProjects(): Promise<
    (Project & {
      category: ServiceCategory;
      media: (ProjectMedia & { mediaAsset: MediaAsset })[];
    })[]
  > {
    return prisma.project.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      include: {
        category: true,
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  /**
   * Atomically updates curated homepage featured projects and keeps Project.isFeatured in sync.
   */
  static async setCuratedHomepageProjects(projectIds: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Verify all projectIds are valid and PUBLISHED
      if (projectIds.length > 0) {
        const publishedCount = await tx.project.count({
          where: {
            id: { in: projectIds },
            status: "PUBLISHED",
          },
        });

        if (publishedCount !== projectIds.length) {
          throw new Error("One or more selected projects are not published or do not exist.");
        }
      }

      // 2. Clear existing curated entries
      await tx.homepageFeaturedProject.deleteMany({});

      // 3. Mark all projects as isFeatured: false first
      await tx.project.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      });

      // 4. Insert new curated sequence
      if (projectIds.length > 0) {
        for (let i = 0; i < projectIds.length; i++) {
          await tx.homepageFeaturedProject.create({
            data: {
              projectId: projectIds[i],
              sortOrder: i,
            },
          });
        }

        // 5. Update isFeatured flag on the selected projects
        await tx.project.updateMany({
          where: { id: { in: projectIds } },
          data: { isFeatured: true },
        });
      }
    });
  }
}

